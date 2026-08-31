import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Product } from '../src/models/product.model.js';
import { executeAnalyticsTool } from '../src/ai/tools/analytics-tools.js';

let server: http.Server;
let baseUrl: string;

function makeRequest(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions: http.RequestOptions = {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed: Record<string, unknown> = {};
        try {
          if (data) parsed = JSON.parse(data);
        } catch {
          parsed = { rawText: data };
        }
        resolve({ status: res.statusCode ?? 500, headers: res.headers, body: parsed });
      });
    });

    req.on('error', (err) => reject(err));

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

describe('Milestone 16 — Security Hardening Verification', () => {
  before(async () => {
    const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/commerceiq_test_milestone16';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@m16test\.com$/ });
    await Product.deleteMany({ sku: /^M16-/ });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await User.deleteMany({ email: /@m16test\.com$/ });
    await Product.deleteMany({ sku: /^M16-/ });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('Requirement 1: Helmet security HTTP headers are present in response', async () => {
    const res = await makeRequest('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-dns-prefetch-control'], 'off');
    assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-powered-by'], undefined);
  });

  it('Requirement 2: CORS configuration handles options preflight cleanly', async () => {
    const res = await makeRequest('/api/health', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
  });

  it('Requirement 3: Rate limiting blocks excess AI endpoint requests', async () => {
    // Send 31 requests with x-test-rate-limit enabled to trigger HTTP 429
    let lastStatus = 200;
    for (let i = 0; i < 32; i++) {
      const res = await makeRequest('/api/ai/health-test', {
        method: 'POST',
        headers: { 'x-test-rate-limit': 'true' },
        body: {},
      });
      lastStatus = res.status;
      if (res.status === 429) {
        assert.equal(res.status, 429);
        assert.equal((res.body.error as { code: string })?.code, 'TOO_MANY_REQUESTS');
        break;
      }
    }
    assert.equal(lastStatus, 429);
  });

  it('Requirement 4: Invalid AI tool arguments fail safely without throwing exceptions', async () => {
    const fakeMerchantId = new mongoose.Types.ObjectId().toString();

    // Invalid range preset
    const res1 = await executeAnalyticsTool(fakeMerchantId, 'get_revenue_summary', { range: 'invalid_preset_abc' });
    assert.equal(res1.toolName, 'get_revenue_summary');
    assert.equal(typeof res1.output, 'object');
    const out1 = res1.output as { success: boolean; error: string };
    assert.equal(out1.success, false);
    assert.match(out1.error, /Invalid range option/i);

    // Negative limit
    const res2 = await executeAnalyticsTool(fakeMerchantId, 'get_top_products', { limit: -5 });
    assert.equal(res2.toolName, 'get_top_products');
    const out2 = res2.output as { success: boolean; error: string };
    assert.equal(out2.success, false);
    assert.match(out2.error, /limit must be a number between 1 and 50/i);

    // Invalid lookbackDays
    const res3 = await executeAnalyticsTool(fakeMerchantId, 'get_inventory_risk', { lookbackDays: 'invalid_num' });
    assert.equal(res3.toolName, 'get_inventory_risk');
    const out3 = res3.output as { success: boolean; error: string };
    assert.equal(out3.success, false);
    assert.match(out3.error, /lookbackDays must be a number/i);

    // Unknown tool name
    const res4 = await executeAnalyticsTool(fakeMerchantId, 'execute_arbitrary_shell_command', {});
    assert.equal(res4.toolName, 'execute_arbitrary_shell_command');
    const out4 = res4.output as { success: boolean; error: string };
    assert.equal(out4.success, false);
    assert.match(out4.error, /Unknown tool name/i);
  });

  it('Requirement 5: Multi-tenant data isolation is preserved in AI tool execution', async () => {
    // Create Merchant A and Merchant B
    const merchantA = await User.create({
      name: 'Merchant A M16',
      email: 'merchanta@m16test.com',
      passwordHash: 'hashedpassword',
    });

    const merchantB = await User.create({
      name: 'Merchant B M16',
      email: 'merchantb@m16test.com',
      passwordHash: 'hashedpassword',
    });

    // Create a product for Merchant A
    await Product.create({
      merchant: merchantA._id,
      name: 'M16 Test Widget',
      sku: 'M16-WDG-001',
      category: 'Electronics',
      price: 100,
      costPrice: 50,
      stock: 50,
      reorderLevel: 10,
    });

    // Execute tool query for Merchant B
    const resultB = await executeAnalyticsTool(merchantB._id.toString(), 'get_top_products', { limit: 5 });
    const outputB = resultB.output as Array<{ name: string }>;
    assert.ok(Array.isArray(outputB));
    assert.equal(outputB.length, 0); // Merchant B must get 0 products
  });
});

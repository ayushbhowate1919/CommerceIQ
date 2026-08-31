import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Product from '../src/models/product.model.js';
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
): Promise<{ status: number; body: Record<string, unknown> }> {
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
        resolve({ status: res.statusCode ?? 500, body: parsed });
      });
    });

    req.on('error', (err) => reject(err));

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

describe('Milestone 18 — Testing Verification Suite', () => {
  let token: string;
  let merchantId: string;

  before(async () => {
    const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/commerceiq_test_milestone18';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await User.deleteMany({ email: /@m18test\.com$/ });
    await Product.deleteMany({ sku: /^M18-/ });

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
    await User.deleteMany({ email: /@m18test\.com$/ });
    await Product.deleteMany({ sku: /^M18-/ });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('1. Auth Integration: Registers merchant and retrieves authenticated session profile', async () => {
    const registerRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Milestone 18 Merchant',
        email: 'merchant@m18test.com',
        password: 'Password123!',
      },
    });

    assert.equal(registerRes.status, 201);
    const data = registerRes.body.data as { token: string; user: { id: string; email: string } };
    assert.ok(data.token);
    token = data.token;
    merchantId = data.user.id;

    const meRes = await makeRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(meRes.status, 200);
    const meUser = (meRes.body.data as { user: { email: string } }).user;
    assert.equal(meUser.email, 'merchant@m18test.com');
  });

  it('2. Product API Integration: Creates, lists, updates, and deletes products', async () => {
    const createRes = await makeRequest('/api/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        name: 'M18 Testing Headset',
        sku: 'M18-HDST-001',
        category: 'Electronics',
        price: 150,
        costPrice: 80,
        stock: 45,
        reorderLevel: 10,
      },
    });

    assert.equal(createRes.status, 201);
    const product = createRes.body.data as { _id: string; name: string; price: number };
    assert.equal(product.name, 'M18 Testing Headset');

    const listRes = await makeRequest('/api/products', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(listRes.status, 200);
    const products = listRes.body.data as Array<{ sku: string }>;
    assert.ok(products.some((p) => p.sku === 'M18-HDST-001'));

    const updateRes = await makeRequest(`/api/products/${product._id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: { price: 175 },
    });
    assert.equal(updateRes.status, 200);
    assert.equal((updateRes.body.data as { price: number }).price, 175);

    const deleteRes = await makeRequest(`/api/products/${product._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(deleteRes.status, 200);
  });

  it('3. Dashboard API Integration: Retrieves KPI summary and analytics trends', async () => {
    const summaryRes = await makeRequest('/api/dashboard/summary?range=30d', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(summaryRes.status, 200);
    assert.ok(summaryRes.body.data);

    const revenueRes = await makeRequest('/api/analytics/revenue?range=30d', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(revenueRes.status, 200);
    assert.ok(Array.isArray(revenueRes.body.data));
  });

  it('4. AI Tool Dispatch Integration: Dispatches all 8 analytics tools cleanly', async () => {
    const tools = [
      'get_revenue_summary',
      'get_top_products',
      'get_revenue_by_category',
      'get_sales_trend',
      'get_inventory_risk',
      'get_product_performance',
      'get_order_summary',
      'get_period_comparison',
    ];

    for (const toolName of tools) {
      const result = await executeAnalyticsTool(merchantId, toolName, { range: '30d' });
      assert.equal(result.toolName, toolName);
      assert.ok(result.output);
    }
  });
});

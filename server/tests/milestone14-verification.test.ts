import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { runSeed } from '../src/seed/seed.js';
import { isGeminiConfigured } from '../src/ai/client.js';
import { executeAnalyticsTool } from '../src/ai/tools/analytics-tools.js';
import User from '../src/models/user.model.js';

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let demoToken = '';
let merchantBToken = '';
let demoUserId = '';
let merchantBUserId = '';

before(async () => {
  await connectDatabase();
  await runSeed();

  server = app.listen(0);
  const address = server.address();
  if (address && typeof address === 'object') {
    baseUrl = `http://localhost:${address.port}`;
  }

  // Login as Demo Merchant
  const demoLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@commerceiq.com', password: 'Password123!' }),
  });
  const demoLoginData = (await demoLoginRes.json()) as { success: boolean; data: { token: string; user: { id: string } } };
  demoToken = demoLoginData.data.token;
  demoUserId = demoLoginData.data.user.id;

  // Register / login Merchant B for data isolation
  const registerBRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Merchant B', email: 'merchantb_m14@example.com', password: 'Password123!' }),
  });
  if (registerBRes.status === 201) {
    const registerBData = (await registerBRes.json()) as { success: boolean; data: { token: string; user: { id: string } } };
    merchantBToken = registerBData.data.token;
    merchantBUserId = registerBData.data.user.id;
  } else {
    const loginBRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'merchantb_m14@example.com', password: 'Password123!' }),
    });
    const loginBData = (await loginBRes.json()) as { success: boolean; data: { token: string; user: { id: string } } };
    merchantBToken = loginBData.data.token;
    merchantBUserId = loginBData.data.user.id;
  }
});

after(async () => {
  if (server) {
    server.close();
  }
  await mongoose.disconnect();
});

test('Milestone 14 — Expand Analytics Tools Verification', async (t) => {
  await t.test('1. Direct Tool Dispatch: get_sales_trend returns time-series points', async () => {
    const result = await executeAnalyticsTool(demoUserId, 'get_sales_trend', { range: '30d', interval: 'day' });
    assert.equal(result.toolName, 'get_sales_trend');
    const output = result.output as Array<{ date: string; revenue: number; orders: number }>;
    assert.ok(Array.isArray(output));
    assert.ok(output.length > 0);
  });

  await t.test('2. Direct Tool Dispatch: get_inventory_risk returns stockout warnings', async () => {
    const result = await executeAnalyticsTool(demoUserId, 'get_inventory_risk', { lookbackDays: 30 });
    assert.equal(result.toolName, 'get_inventory_risk');
    const output = result.output as { data: Array<{ name: string; riskLevel: string }>; pagination: { total: number } };
    assert.ok(Array.isArray(output.data));
    assert.ok(output.pagination.total > 0);
  });

  await t.test('3. Direct Tool Dispatch: get_product_performance returns sales & rating metrics', async () => {
    const result = await executeAnalyticsTool(demoUserId, 'get_product_performance', { range: '30d' });
    assert.equal(result.toolName, 'get_product_performance');
    const output = result.output as Array<{ name: string; unitsSold: number; revenue: number }>;
    assert.ok(Array.isArray(output));
    assert.ok(output.length > 0);
  });

  await t.test('4. Direct Tool Dispatch: get_order_summary returns status breakdown & gross/net revenue', async () => {
    const result = await executeAnalyticsTool(demoUserId, 'get_order_summary', { range: '30d' });
    assert.equal(result.toolName, 'get_order_summary');
    const output = result.output as { totalOrders: number; grossRevenue: number; netRevenue: number; statusBreakdown: Record<string, number> };
    assert.ok(output.totalOrders > 0);
    assert.ok(output.grossRevenue >= output.netRevenue);
    assert.ok(typeof output.statusBreakdown.delivered === 'number');
  });

  await t.test('5. Direct Tool Dispatch: get_period_comparison returns comparative current vs previous metrics', async () => {
    const result = await executeAnalyticsTool(demoUserId, 'get_period_comparison', { range: '30d' });
    assert.equal(result.toolName, 'get_period_comparison');
    const output = result.output as { summary: { revenue: number; orders: number; revenueChange: number } };
    assert.ok(typeof output.summary.revenue === 'number');
    assert.ok(typeof output.summary.orders === 'number');
    assert.ok(typeof output.summary.revenueChange === 'number');
  });

  await t.test('6. Multi-Tenant Isolation: Merchant B receives 0 metrics across expanded tools', async () => {
    const trendB = await executeAnalyticsTool(merchantBUserId, 'get_sales_trend', { range: '30d' });
    assert.equal((trendB.output as Array<unknown>).length, 0);

    const invB = await executeAnalyticsTool(merchantBUserId, 'get_inventory_risk', { lookbackDays: 30 });
    assert.equal((invB.output as { pagination: { total: number } }).pagination.total, 0);

    const orderB = await executeAnalyticsTool(merchantBUserId, 'get_order_summary', { range: '30d' });
    assert.equal((orderB.output as { totalOrders: number }).totalOrders, 0);
  });

  await t.test('7. Endpoint query execution using expanded tool capabilities', async () => {
    const expandedQueries = [
      'Which products are at risk of running out of stock?',
      'How did our sales trend over the last 30 days?',
      'What is our order cancellation rate and total net revenue?',
      'How does our performance this period compare to the previous period?',
    ];

    for (const queryText of expandedQueries) {
      const response = await fetch(`${baseUrl}/api/ai/analytics-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${demoToken}` },
        body: JSON.stringify({ query: queryText }),
      });

      if (isGeminiConfigured()) {
        if (response.status === 200) {
          const json = (await response.json()) as {
            success: boolean;
            data: { answer: string; toolsUsed: Array<{ toolName: string }>; aiConfigured: boolean };
          };

          assert.equal(json.success, true);
          assert.ok(typeof json.data.answer === 'string');
          assert.equal(json.data.aiConfigured, true);
        } else {
          assert.ok([502, 503].includes(response.status), `Expected 200, 502 or 503 status, got ${response.status}`);
        }
      } else {
        assert.equal(response.status, 200);
        const json = (await response.json()) as {
          success: boolean;
          data: { answer: string; toolsUsed: Array<{ toolName: string }>; aiConfigured: boolean };
        };

        assert.equal(json.success, true);
        assert.equal(json.data.aiConfigured, false);
        assert.ok(json.data.answer.includes('unconfigured'));
      }
    }
  });
});

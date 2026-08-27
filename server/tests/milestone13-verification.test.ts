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
    body: JSON.stringify({ name: 'Merchant B', email: 'merchantb_m13@example.com', password: 'Password123!' }),
  });
  if (registerBRes.status === 201) {
    const registerBData = (await registerBRes.json()) as { success: boolean; data: { token: string; user: { id: string } } };
    merchantBToken = registerBData.data.token;
    merchantBUserId = registerBData.data.user.id;
  } else {
    const loginBRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'merchantb_m13@example.com', password: 'Password123!' }),
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

test('Milestone 13 — AI Tool Calling & Natural-Language Analytics Verification', async (t) => {
  await t.test('1. Unauthenticated analytics-query requests return HTTP 401 UNAUTHORIZED', async () => {
    const response = await fetch(`${baseUrl}/api/ai/analytics-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Which category generated the most revenue?' }),
    });
    assert.equal(response.status, 401);
  });

  await t.test('2. Invalid query payload returns HTTP 400 VALIDATION_ERROR', async () => {
    // Missing query
    const res1 = await fetch(`${baseUrl}/api/ai/analytics-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${demoToken}` },
      body: JSON.stringify({}),
    });
    assert.equal(res1.status, 400);

    // Empty string
    const res2 = await fetch(`${baseUrl}/api/ai/analytics-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${demoToken}` },
      body: JSON.stringify({ query: '   ' }),
    });
    assert.equal(res2.status, 400);
  });

  await t.test('3. Direct Tool Dispatch: get_revenue_summary returns accurate database metrics', async () => {
    const result = await executeAnalyticsTool(demoUserId, 'get_revenue_summary', { range: '30d' });
    assert.equal(result.toolName, 'get_revenue_summary');
    const output = result.output as { revenue: number; orders: number; aov: number };
    assert.ok(typeof output.revenue === 'number');
    assert.ok(output.orders > 0);
  });

  await t.test('4. Direct Tool Dispatch: get_top_products returns ranked top products', async () => {
    const result = await executeAnalyticsTool(demoUserId, 'get_top_products', { limit: 5, sortBy: 'revenue', range: '30d' });
    assert.equal(result.toolName, 'get_top_products');
    const output = result.output as Array<{ name: string; revenue: number }>;
    assert.ok(Array.isArray(output));
    assert.ok(output.length <= 5);
    if (output.length > 1) {
      assert.ok(output[0].revenue >= output[1].revenue);
    }
  });

  await t.test('5. Direct Tool Dispatch: get_revenue_by_category returns category breakdown', async () => {
    const result = await executeAnalyticsTool(demoUserId, 'get_revenue_by_category', { range: '30d' });
    assert.equal(result.toolName, 'get_revenue_by_category');
    const output = result.output as Array<{ category: string; revenue: number }>;
    assert.ok(Array.isArray(output));
    assert.ok(output.length > 0);
  });

  await t.test('6. Multi-Tenant Isolation: Merchant B tool dispatch yields zero metrics', async () => {
    const summaryB = await executeAnalyticsTool(merchantBUserId, 'get_revenue_summary', { range: '30d' });
    const outputB = summaryB.output as { revenue: number; orders: number };
    assert.equal(outputB.revenue, 0);
    assert.equal(outputB.orders, 0);
  });

  await t.test('7. Endpoint natural-language query execution (handles both live API & degraded mode)', async () => {
    const questions = [
      'Which category generated the most revenue last month?',
      'What were our top 5 products by revenue?',
      'How much revenue did we generate this month?',
    ];

    for (const queryText of questions) {
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


import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { runSeed } from '../src/seed/seed.js';
import { isGeminiConfigured } from '../src/ai/client.js';

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let demoToken = '';

before(async () => {
  await connectDatabase();
  await runSeed();

  server = app.listen(0);
  const address = server.address();
  if (address && typeof address === 'object') {
    baseUrl = `http://localhost:${address.port}`;
  }

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@commerceiq.com', password: 'Password123!' }),
  });
  const loginData = (await loginRes.json()) as { success: boolean; data: { token: string } };
  demoToken = loginData.data.token;
});

after(async () => {
  if (server) {
    server.close();
  }
  await mongoose.disconnect();
});

test('Milestone 15 — AI Assistant UI Backend & Health Integration', async (t) => {
  await t.test('1. GET /api/ai/health-test status endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/ai/health-test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(res.status, 200);
    const json = (await res.json()) as { success: boolean; data: { configured: boolean; model: string } };
    assert.equal(json.success, true);
    assert.equal(typeof json.data.configured, 'boolean');
    assert.ok(typeof json.data.model === 'string');
  });

  await t.test('2. Unauthenticated POST /api/ai/analytics-query returns HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/ai/analytics-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'What is our top selling product?' }),
    });
    assert.equal(res.status, 401);
  });

  await t.test('3. Authenticated POST /api/ai/analytics-query returns formatted assistant answer', async () => {
    const res = await fetch(`${baseUrl}/api/ai/analytics-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${demoToken}` },
      body: JSON.stringify({ query: 'Which category generated the most revenue last month?' }),
    });

    if (isGeminiConfigured()) {
      if (res.status === 200) {
        const json = (await res.json()) as {
          success: boolean;
          data: { answer: string; toolsUsed: Array<{ toolName: string }>; aiConfigured: boolean };
        };
        assert.equal(json.success, true);
        assert.ok(typeof json.data.answer === 'string');
        assert.equal(json.data.aiConfigured, true);
      } else {
        assert.ok([502, 503].includes(res.status));
      }
    } else {
      assert.equal(res.status, 200);
      const json = (await res.json()) as {
        success: boolean;
        data: { answer: string; toolsUsed: Array<{ toolName: string }>; aiConfigured: boolean };
      };
      assert.equal(json.success, true);
      assert.equal(json.data.aiConfigured, false);
      assert.ok(json.data.answer.includes('unconfigured'));
    }
  });
});

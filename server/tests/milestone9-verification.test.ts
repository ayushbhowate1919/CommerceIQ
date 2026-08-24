import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { runSeed } from '../src/seed/seed.js';
import { getGeminiClient, getGeminiModelName, isGeminiConfigured } from '../src/ai/client.js';

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

  const demoLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@commerceiq.com', password: 'Password123!' }),
  });
  const demoLoginData = (await demoLoginRes.json()) as { success: boolean; data: { token: string } };
  demoToken = demoLoginData.data.token;
});

after(async () => {
  if (server) {
    server.close();
  }
  await mongoose.disconnect();
});

test('Milestone 9 — Gemini Integration Foundation Verification', async (t) => {
  await t.test('1. Unauthenticated POST /api/ai/health-test returns HTTP 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/api/ai/health-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(res.status, 401);
    const data = (await res.json()) as { success: boolean; error: { code: string } };
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'UNAUTHORIZED');
  });

  await t.test('2. Authenticated POST /api/ai/health-test returns HTTP 200 with structured health response', async () => {
    const res = await fetch(`${baseUrl}/api/ai/health-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${demoToken}`,
      },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      success: boolean;
      data: {
        configured: boolean;
        status: string;
        model: string;
        responseText?: string;
        error?: string;
      };
    };

    assert.equal(body.success, true);
    assert.ok(body.data);
    assert.equal(typeof body.data.configured, 'boolean');
    assert.equal(typeof body.data.status, 'string');
    assert.equal(body.data.model, getGeminiModelName());

    if (body.data.configured && body.data.status === 'ok') {
      assert.ok(body.data.responseText, 'Should return non-empty responseText when configured and ok');
    } else {
      assert.ok(
        body.data.responseText || body.data.error,
        'Should return responseText explanation or error string when unconfigured'
      );
    }
  });

  await t.test('3. Verify Gemini client helpers function correctly', async () => {
    const configured = isGeminiConfigured();
    assert.equal(typeof configured, 'boolean');

    const modelName = getGeminiModelName();
    assert.equal(typeof modelName, 'string');

    const client = getGeminiClient();
    if (configured) {
      assert.ok(client, 'Gemini client instance should be instantiated when API key is present');
    } else {
      assert.equal(client, null, 'Gemini client should be null when unconfigured');
    }
  });
});

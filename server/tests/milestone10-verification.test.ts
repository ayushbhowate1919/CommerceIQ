import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { runSeed } from '../src/seed/seed.js';
import { isGeminiConfigured } from '../src/ai/client.js';
import { validateGenerateDescriptionInput } from '../src/validators/ai.validator.js';

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

test('Milestone 10 — AI Product Description Generator Verification', async (t) => {
  await t.test('1. Unauthenticated POST /api/ai/generate-description returns HTTP 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/api/ai/generate-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Product' }),
    });

    assert.equal(res.status, 401);
    const data = (await res.json()) as { success: boolean; error: { code: string } };
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'UNAUTHORIZED');
  });

  await t.test('2. Missing name field returns HTTP 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/api/ai/generate-description`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${demoToken}`,
      },
      body: JSON.stringify({ category: 'Electronics', tone: 'Professional' }),
    });

    assert.equal(res.status, 400);
    const data = (await res.json()) as { success: boolean; error: { code: string } };
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'VALIDATION_ERROR');
  });

  await t.test('3. Verify payload validator normalizes string and array inputs', async () => {
    const result = validateGenerateDescriptionInput({
      name: '  Aura Pro Smart Watch  ',
      category: ' Electronics ',
      features: 'Heart rate monitor, Sleep tracking\nWater resistant',
      keywords: ['smartwatch', ' fitness tracker ', ''],
      tone: ' Persuasive ',
    });

    assert.equal(result.name, 'Aura Pro Smart Watch');
    assert.equal(result.category, 'Electronics');
    assert.deepEqual(result.features, ['Heart rate monitor', 'Sleep tracking', 'Water resistant']);
    assert.deepEqual(result.keywords, ['smartwatch', 'fitness tracker']);
    assert.equal(result.tone, 'Persuasive');
  });

  await t.test('4. POST /api/ai/generate-description with valid payload executes or returns degraded status', async () => {
    const payload = {
      name: 'Wireless Ergonomic Earbuds',
      category: 'Electronics',
      features: ['Noise cancellation', '30hr battery', 'IPX7 waterproof'],
      targetAudience: 'Commuters & Athletes',
      tone: 'Enthusiastic',
      keywords: ['wireless earbuds', 'noise cancelling audio'],
    };

    const res = await fetch(`${baseUrl}/api/ai/generate-description`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${demoToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (isGeminiConfigured()) {
      if (res.status === 200) {
        const data = (await res.json()) as {
          success: boolean;
          data: {
            title: string;
            shortDescription: string;
            longDescription: string;
            bulletPoints: string[];
            seoKeywords: string[];
          };
        };
        assert.equal(data.success, true);
        assert.ok(data.data.title);
        assert.ok(data.data.shortDescription);
        assert.ok(data.data.longDescription);
        assert.ok(Array.isArray(data.data.bulletPoints));
        assert.ok(Array.isArray(data.data.seoKeywords));
      } else {
        assert.ok([502, 503].includes(res.status), `Expected 502 or 503 status, got ${res.status}`);
      }
    } else {
      assert.equal(res.status, 503);
      const data = (await res.json()) as { success: boolean; error: { code: string; message: string } };
      assert.equal(data.success, false);
      assert.equal(data.error.code, 'AI_UNCONFIGURED');
    }
  });
});

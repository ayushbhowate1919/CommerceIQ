import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { runSeed } from '../src/seed/seed.js';
import { isGeminiConfigured } from '../src/ai/client.js';
import Product from '../src/models/product.model.js';
import Review from '../src/models/review.model.js';
import { type SingleReviewAnalysis } from '../src/ai/schemas/review-analysis.schema.js';

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let demoToken = '';
let merchantBToken = '';

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
  const demoLoginData = (await demoLoginRes.json()) as { success: boolean; data: { token: string } };
  demoToken = demoLoginData.data.token;

  // Register or login Merchant B for isolation testing
  const registerBRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Merchant B', email: 'merchantb_m11@example.com', password: 'Password123!' }),
  });
  if (registerBRes.status === 201) {
    const registerBData = (await registerBRes.json()) as { success: boolean; data: { token: string } };
    merchantBToken = registerBData.data.token;
  } else {
    const loginBRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'merchantb_m11@example.com', password: 'Password123!' }),
    });
    const loginBData = (await loginBRes.json()) as { success: boolean; data: { token: string } };
    merchantBToken = loginBData.data.token;
  }
});

after(async () => {
  if (server) {
    server.close();
  }
  await mongoose.disconnect();
});

test('Milestone 11 — Review AI Analysis Verification', async (t) => {
  await t.test('1. Unauthenticated review AI requests return HTTP 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/api/ai/analyze-review/507f1f77bcf86cd799439011`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 401);
    const data = (await res.json()) as { success: boolean; error: { code: string } };
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'UNAUTHORIZED');
  });

  await t.test('2. Invalid hex reviewId returns HTTP 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/api/ai/analyze-review/invalid-id-format`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${demoToken}`,
      },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const data = (await res.json()) as { success: boolean; error: { code: string } };
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'VALIDATION_ERROR');
  });

  await t.test('3. Single Review Analysis & DB Caching', async () => {
    const targetReview = await Review.findOne({}).exec();
    assert.ok(targetReview, 'Seeded review document must exist');

    const reviewId = targetReview._id.toString();

    // Test deterministic DB caching flow
    targetReview.aiAnalysis = {
      sentiment: 'positive',
      topics: ['battery life', 'audio quality'],
      summary: 'Customer loves the long battery life and crisp sound.',
      suggestedAction: 'Highlight battery specifications in marketing.',
      analyzedAt: new Date().toISOString(),
    };
    await targetReview.save();

    // Call with forceRefresh = false -> must return cached DB analysis with HTTP 200
    const cachedRes = await fetch(`${baseUrl}/api/ai/analyze-review/${reviewId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${demoToken}`,
      },
      body: JSON.stringify({ forceRefresh: false }),
    });

    assert.equal(cachedRes.status, 200);
    const cachedData = (await cachedRes.json()) as { success: boolean; data: SingleReviewAnalysis };
    assert.equal(cachedData.success, true);
    assert.equal(cachedData.data.sentiment, 'positive');
    assert.equal(cachedData.data.summary, 'Customer loves the long battery life and crisp sound.');

    // Now test forceRefresh flow against Gemini or degraded key fallback
    const liveRes = await fetch(`${baseUrl}/api/ai/analyze-review/${reviewId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${demoToken}`,
      },
      body: JSON.stringify({ forceRefresh: true }),
    });

    if (isGeminiConfigured()) {
      if (liveRes.status === 200) {
        const data = (await liveRes.json()) as { success: boolean; data: SingleReviewAnalysis };
        assert.equal(data.success, true);
        assert.ok(['positive', 'neutral', 'negative'].includes(data.data.sentiment));
      } else {
        assert.equal(liveRes.status, 502);
      }
    } else {
      assert.equal(liveRes.status, 503);
    }
  });

  await t.test('4. Batch Product Reviews Analysis', async () => {
    const targetProduct = await Product.findOne({}).exec();
    assert.ok(targetProduct, 'Seeded product document must exist');

    const productId = targetProduct._id.toString();

    const res = await fetch(`${baseUrl}/api/ai/analyze-product-reviews/${productId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${demoToken}`,
      },
      body: JSON.stringify({ limit: 15 }),
    });

    if (isGeminiConfigured()) {
      if (res.status === 200) {
        const data = (await res.json()) as {
          success: boolean;
          data: {
            overallSentiment: string;
            sentimentScore: number;
            topPositiveThemes: string[];
            topNegativeThemes: string[];
            summary: string;
            recommendedActions: string[];
          };
        };
        assert.equal(data.success, true);
        assert.ok(['positive', 'mixed', 'negative', 'neutral'].includes(data.data.overallSentiment));
        assert.ok(typeof data.data.sentimentScore === 'number');
        assert.ok(Array.isArray(data.data.topPositiveThemes));
      } else {
        assert.equal(res.status, 502);
      }
    } else {
      assert.equal(res.status, 503);
    }
  });

  await t.test('5. Multi-Tenant Data Isolation: Merchant B cannot analyze Merchant A reviews/products', async () => {
    const demoReview = await Review.findOne({}).exec();
    assert.ok(demoReview);

    const resReview = await fetch(`${baseUrl}/api/ai/analyze-review/${demoReview._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantBToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(resReview.status, 404);

    const demoProduct = await Product.findOne({}).exec();
    assert.ok(demoProduct);

    const resProduct = await fetch(`${baseUrl}/api/ai/analyze-product-reviews/${demoProduct._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantBToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(resProduct.status, 404);
  });
});

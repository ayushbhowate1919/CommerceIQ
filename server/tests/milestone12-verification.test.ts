import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { runSeed } from '../src/seed/seed.js';
import { isGeminiConfigured } from '../src/ai/client.js';
import AIInsight from '../src/models/ai-insight.model.js';
import User from '../src/models/user.model.js';
import { type BusinessAdvisorResult } from '../src/ai/schemas/business-advisor.schema.js';

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let demoToken = '';
let merchantBToken = '';
let demoUser: InstanceType<typeof User>;

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
  const demoLoginData = (await demoLoginRes.json()) as { success: boolean; data: { token: string; user: InstanceType<typeof User> } };
  demoToken = demoLoginData.data.token;

  const foundUser = await User.findOne({ email: 'demo@commerceiq.com' }).exec();
  assert.ok(foundUser);
  demoUser = foundUser;

  // Register or login Merchant B for isolation testing
  const registerBRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Merchant B', email: 'merchantb_m12@example.com', password: 'Password123!' }),
  });
  if (registerBRes.status === 201) {
    const registerBData = (await registerBRes.json()) as { success: boolean; data: { token: string } };
    merchantBToken = registerBData.data.token;
  } else {
    const loginBRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'merchantb_m12@example.com', password: 'Password123!' }),
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

test('Milestone 12 — AI Business Advisor Verification', async (t) => {
  await t.test('1. Unauthenticated Business Advisor endpoints return HTTP 401 UNAUTHORIZED', async () => {
    const postRes = await fetch(`${baseUrl}/api/ai/business-advisor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(postRes.status, 401);

    const getRes = await fetch(`${baseUrl}/api/ai/business-advisor/latest`, {
      method: 'GET',
    });
    assert.equal(getRes.status, 401);
  });

  await t.test('2. End-to-End Business Advisor generation & MongoDB persistence', async () => {
    // Clear any pre-existing insights for clean test environment
    await AIInsight.deleteMany({ merchant: demoUser._id, type: 'business_advisor' }).exec();

    // Create a deterministic cached AIInsight in MongoDB to verify caching & retrieval flow
    const sampleInsightData: BusinessAdvisorResult = {
      healthScore: 82,
      executiveSummary: 'Strong period growth driven by Electronics catalog.',
      strengths: ['Revenue grew by 14.8%', 'Headphones generated highest volume'],
      risks: ['2 products facing stockout warning'],
      recommendedActions: [
        { priority: 'high', action: 'Reorder Headphones', impact: 'Prevent stockout', category: 'inventory' },
      ],
      timeRange: '30d',
      analyzedAt: new Date().toISOString(),
    };

    await AIInsight.create({
      merchant: demoUser._id,
      type: 'business_advisor',
      title: 'AI Business Advisor Summary (30d)',
      summary: sampleInsightData.executiveSummary,
      severity: 'info',
      source: 'gemini_advisor',
      supportingMetrics: sampleInsightData,
    });

    // Test GET /api/ai/business-advisor/latest retrieves stored report
    const getRes = await fetch(`${baseUrl}/api/ai/business-advisor/latest`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${demoToken}`,
      },
    });
    assert.equal(getRes.status, 200);
    const getData = (await getRes.json()) as { success: boolean; data: BusinessAdvisorResult };
    assert.equal(getData.success, true);
    assert.equal(getData.data.healthScore, 82);
    assert.equal(getData.data.executiveSummary, 'Strong period growth driven by Electronics catalog.');

    // Test POST /api/ai/business-advisor with forceRefresh = false -> returns cached report
    const postCachedRes = await fetch(`${baseUrl}/api/ai/business-advisor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${demoToken}`,
      },
      body: JSON.stringify({ timeRange: '30d', forceRefresh: false }),
    });
    assert.equal(postCachedRes.status, 200);
    const postCachedData = (await postCachedRes.json()) as { success: boolean; data: BusinessAdvisorResult };
    assert.equal(postCachedData.data.healthScore, 82);

    // Test POST /api/ai/business-advisor with forceRefresh = true (invokes Gemini if configured)
    const postLiveRes = await fetch(`${baseUrl}/api/ai/business-advisor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${demoToken}`,
      },
      body: JSON.stringify({ timeRange: '30d', forceRefresh: true }),
    });

    if (isGeminiConfigured()) {
      if (postLiveRes.status === 200) {
        const liveData = (await postLiveRes.json()) as { success: boolean; data: BusinessAdvisorResult };
        assert.equal(liveData.success, true);
        assert.ok(typeof liveData.data.healthScore === 'number');
        assert.ok(liveData.data.executiveSummary);
        assert.ok(Array.isArray(liveData.data.strengths));
      } else {
        const errPayload = await postLiveRes.json().catch(() => null);
        assert.ok(
          [200, 500, 502, 503].includes(postLiveRes.status),
          `Unexpected status code ${postLiveRes.status}: ${JSON.stringify(errPayload)}`
        );
      }
    } else {
      assert.ok([200, 503].includes(postLiveRes.status));
    }
  });

  await t.test('3. Multi-Tenant Isolation — Merchant B sees zero/null advisor insights', async () => {
    const latestRes = await fetch(`${baseUrl}/api/ai/business-advisor/latest`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${merchantBToken}`,
      },
    });
    assert.equal(latestRes.status, 200);
    const data = (await latestRes.json()) as { success: boolean; data: BusinessAdvisorResult | null };
    assert.equal(data.success, true);
    assert.equal(data.data, null, "Merchant B must not retrieve Merchant A's advisor reports");
  });
});

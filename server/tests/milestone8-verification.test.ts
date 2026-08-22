import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import Product from '../src/models/product.model.js';
import User from '../src/models/user.model.js';
import { runSeed } from '../src/seed/seed.js';

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let demoToken = '';
let emptyMerchantToken = '';
let sampleProductId = '';

before(async () => {
  await connectDatabase();
  await runSeed();

  server = app.listen(0);
  const address = server.address();
  if (address && typeof address === 'object') {
    baseUrl = `http://localhost:${address.port}`;
  }

  // Login demo merchant
  const demoLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@commerceiq.com', password: 'Password123!' }),
  });
  const demoLoginData = (await demoLoginRes.json()) as { success: boolean; data: { token: string } };
  demoToken = demoLoginData.data.token;

  // Clean and Register empty merchant for multi-tenant isolation testing
  await User.deleteMany({ email: 'm8_empty@example.com' });
  const emptyRegRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Empty Merchant M8', email: 'm8_empty@example.com', password: 'Password123!' }),
  });
  const emptyRegData = (await emptyRegRes.json()) as { success: boolean; data: { token: string } };
  emptyMerchantToken = emptyRegData.data.token;

  // Get a sample product ID
  const product = await Product.findOne().lean();
  if (product) {
    sampleProductId = String(product._id);
  }
});

after(async () => {
  if (server) {
    server.close();
  }
  await mongoose.disconnect();
});

test('Milestone 8 — Review Management Verification', async (t) => {
  await t.test('1. Unauthenticated review endpoints return HTTP 401 UNAUTHORIZED', async () => {
    const endpoints = ['/api/reviews', '/api/reviews/summary', `/api/reviews/product/${sampleProductId || '507f1f77bcf86cd799439011'}`];
    for (const endpoint of endpoints) {
      const res = await fetch(`${baseUrl}${endpoint}`);
      assert.equal(res.status, 401);
      const body = (await res.json()) as { success: boolean; error: { code: string } };
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    }
  });

  await t.test('2. Invalid query parameters return HTTP 400 VALIDATION_ERROR', async () => {
    const invalidRatingRes = await fetch(`${baseUrl}/api/reviews?rating=10`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(invalidRatingRes.status, 400);

    const invalidLimitRes = await fetch(`${baseUrl}/api/reviews?limit=500`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(invalidLimitRes.status, 400);

    const invalidProductIdRes = await fetch(`${baseUrl}/api/reviews/product/invalid-id`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(invalidProductIdRes.status, 400);
  });

  await t.test('3. GET /api/reviews returns paginated reviews with populated product and customer details', async () => {
    const res = await fetch(`${baseUrl}/api/reviews?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      success: boolean;
      data: Array<{
        _id: string;
        rating: number;
        text: string;
        productId?: { name: string; sku: string };
        customerId?: { name: string; email: string };
      }>;
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };

    assert.equal(body.success, true);
    assert.equal(body.pagination.page, 1);
    assert.equal(body.pagination.limit, 10);
    assert.ok(body.pagination.total >= 300, 'Seeded dataset should contain at least 300 reviews');
    assert.equal(body.data.length, 10);

    const first = body.data[0];
    assert.ok(first._id);
    assert.ok(first.rating >= 1 && first.rating <= 5);
    assert.ok(first.text);
    assert.ok(first.productId?.name, 'Product should be populated');
    assert.ok(first.customerId?.name, 'Customer should be populated');
  });

  await t.test('4. GET /api/reviews filters by exact rating', async () => {
    const res = await fetch(`${baseUrl}/api/reviews?rating=1`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      data: Array<{ rating: number }>;
    };

    for (const rev of body.data) {
      assert.equal(rev.rating, 1);
    }
  });

  await t.test('5. GET /api/reviews filters by search text', async () => {
    const res = await fetch(`${baseUrl}/api/reviews?search=quality`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      data: Array<{ text: string }>;
    };

    for (const rev of body.data) {
      assert.ok(rev.text.toLowerCase().includes('quality'));
    }
  });

  await t.test('6. GET /api/reviews/summary returns complete store review statistics', async () => {
    const res = await fetch(`${baseUrl}/api/reviews/summary`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      success: boolean;
      data: {
        totalReviews: number;
        averageRating: number;
        negativeReviewsCount: number;
        positiveReviewsCount: number;
        starDistribution: Array<{ rating: number; count: number; percentage: number }>;
        lowestRatedProducts: Array<{ productId: string; name: string; averageRating: number }>;
        recentNegativeReviews: Array<{ rating: number }>;
      };
    };

    assert.equal(body.success, true);
    assert.ok(body.data.totalReviews >= 300);
    assert.ok(body.data.averageRating > 0 && body.data.averageRating <= 5);
    assert.equal(body.data.starDistribution.length, 5);

    // Sum of star counts equals total reviews
    const sumCounts = body.data.starDistribution.reduce((acc, curr) => acc + curr.count, 0);
    assert.equal(sumCounts, body.data.totalReviews);

    // Verify recent negative reviews have rating <= 2
    for (const neg of body.data.recentNegativeReviews) {
      assert.ok(neg.rating <= 2);
    }
  });

  await t.test('7. GET /api/reviews/product/:productId returns product review breakdown', async () => {
    const productsRes = await fetch(`${baseUrl}/api/products?limit=1`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    const productsBody = (await productsRes.json()) as { data: Array<{ _id: string; name: string }> };
    const prodId = productsBody.data[0]._id;

    const res = await fetch(`${baseUrl}/api/reviews/product/${prodId}`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      success: boolean;
      data: {
        productId: string;
        productName: string;
        totalReviews: number;
        averageRating: number;
        starDistribution: Array<{ rating: number; count: number }>;
      };
    };

    assert.equal(body.success, true);
    assert.equal(body.data.productId, prodId);
    assert.equal(body.data.productName, productsBody.data[0].name);
    assert.equal(body.data.starDistribution.length, 5);
  });

  await t.test('8. Multi-Tenant Isolation — Merchant B receives 0 reviews and empty summary', async () => {
    const listRes = await fetch(`${baseUrl}/api/reviews`, {
      headers: { Authorization: `Bearer ${emptyMerchantToken}` },
    });
    assert.equal(listRes.status, 200);
    const listBody = (await listRes.json()) as { data: Array<unknown>; pagination: { total: number } };
    assert.equal(listBody.pagination.total, 0);
    assert.equal(listBody.data.length, 0);

    const summaryRes = await fetch(`${baseUrl}/api/reviews/summary`, {
      headers: { Authorization: `Bearer ${emptyMerchantToken}` },
    });
    assert.equal(summaryRes.status, 200);
    const summaryBody = (await summaryRes.json()) as { data: { totalReviews: number; averageRating: number } };
    assert.equal(summaryBody.data.totalReviews, 0);
    assert.equal(summaryBody.data.averageRating, 0);
  });
});

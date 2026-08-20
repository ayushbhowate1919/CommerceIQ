import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import User from '../src/models/user.model.js';
import { runSeed } from '../src/seed/seed.js';

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let demoToken = '';
let emptyMerchantToken = '';

before(async () => {
  await connectDatabase();

  // Ensure seed data is populated
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

  // Clean and Register empty merchant for isolation testing
  await User.deleteMany({ email: 'm5_empty@example.com' });
  const emptyRegRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Empty Merchant', email: 'm5_empty@example.com', password: 'Password123!' }),
  });
  const emptyRegData = (await emptyRegRes.json()) as { success: boolean; data: { token: string } };
  emptyMerchantToken = emptyRegData.data.token;
});

after(async () => {
  if (server) {
    server.close();
  }
  await mongoose.disconnect();
});

test('Milestone 5 — Analytics Backend Verification', async (t) => {
  await t.test('1. Unauthenticated analytics requests return 401 UNAUTHORIZED', async () => {
    const endpoints = [
      '/api/dashboard/summary',
      '/api/analytics/revenue',
      '/api/analytics/categories',
      '/api/analytics/top-products',
      '/api/analytics/order-summary',
      '/api/analytics/period-comparison',
      '/api/analytics/product-performance',
    ];

    for (const endpoint of endpoints) {
      const res = await fetch(`${baseUrl}${endpoint}`);
      assert.equal(res.status, 401, `Endpoint ${endpoint} must require authentication`);
      const body = (await res.json()) as { success: boolean; error: { code: string } };
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    }
  });

  await t.test('2. Invalid query parameters return 400 VALIDATION_ERROR', async () => {
    const invalidRes = await fetch(`${baseUrl}/api/dashboard/summary?range=invalid_range`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(invalidRes.status, 400);
    const body = (await invalidRes.json()) as { success: boolean; error: { code: string } };
    assert.equal(body.error.code, 'VALIDATION_ERROR');

    const invalidLimitRes = await fetch(`${baseUrl}/api/analytics/top-products?limit=100`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(invalidLimitRes.status, 400);
  });

  await t.test('3. GET /api/dashboard/summary returns accurate KPI calculations', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard/summary?range=90d`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      success: boolean;
      data: {
        revenue: number;
        orders: number;
        aov: number;
        unitsSold: number;
        revenueChange: number;
        ordersChange: number;
        aovChange: number;
        unitsSoldChange: number;
      };
    };

    assert.equal(body.success, true);
    assert.ok(body.data.revenue > 0, 'Total revenue should be greater than 0');
    assert.ok(body.data.orders > 0, 'Total orders should be greater than 0');
    assert.ok(body.data.aov > 0, 'AOV should be greater than 0');
    assert.ok(body.data.unitsSold > 0, 'Units sold should be greater than 0');
    assert.equal(typeof body.data.revenueChange, 'number');
    assert.equal(typeof body.data.ordersChange, 'number');
  });

  await t.test('4. GET /api/analytics/revenue returns time-series trend array', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/revenue?range=30d`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      success: boolean;
      data: Array<{ date: string; revenue: number; orders: number; aov: number }>;
    };

    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0, 'Revenue trend should contain data points');

    const point = body.data[0];
    assert.ok(point.date, 'Point must contain date');
    assert.equal(typeof point.revenue, 'number');
    assert.equal(typeof point.orders, 'number');
  });

  await t.test('5. GET /api/analytics/categories returns category distribution summing to ~100%', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/categories?range=90d`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      success: boolean;
      data: Array<{ category: string; revenue: number; quantity: number; orderCount: number; percentageOfTotal: number }>;
    };

    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 3, 'Should have multiple seeded categories');

    const totalPercentage = body.data.reduce((sum, item) => sum + item.percentageOfTotal, 0);
    assert.ok(Math.abs(totalPercentage - 100) < 1, 'Category percentages should sum close to 100%');
  });

  await t.test('6. GET /api/analytics/top-products respects limit and ranking', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/top-products?limit=3&range=90d`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      success: boolean;
      data: Array<{ productId: string; name: string; revenue: number; quantity: number }>;
    };

    assert.equal(body.success, true);
    assert.equal(body.data.length, 3, 'Should return exactly 3 top products');
    assert.ok(body.data[0].revenue >= body.data[1].revenue, 'Products should be sorted by revenue descending');
  });

  await t.test('7. GET /api/analytics/order-summary returns correct status breakdown', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/order-summary?range=90d`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      success: boolean;
      data: {
        totalOrders: number;
        grossRevenue: number;
        netRevenue: number;
        statusBreakdown: Record<string, number>;
      };
    };

    assert.equal(body.success, true);
    assert.ok(body.data.totalOrders > 0);
    assert.ok(body.data.grossRevenue >= body.data.netRevenue, 'Gross revenue must be >= Net revenue (which excludes cancelled)');
    assert.ok(body.data.statusBreakdown.delivered > 0, 'Must have delivered orders');
  });

  await t.test('8. GET /api/analytics/period-comparison returns current and previous period stats', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/period-comparison?range=30d`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      success: boolean;
      data: {
        summary: { revenue: number; orders: number };
        categories: { current: unknown[]; previous: unknown[] };
      };
    };

    assert.equal(body.success, true);
    assert.ok(body.data.summary);
    assert.ok(Array.isArray(body.data.categories.current));
  });

  await t.test('9. GET /api/analytics/product-performance returns detailed product metrics', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/product-performance?range=90d`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      success: boolean;
      data: Array<{ productId: string; name: string; unitsSold: number; revenue: number; rating: number }>;
    };

    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
  });

  await t.test('10. Multi-Tenant Isolation — Merchant B sees zero metrics', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard/summary?range=30d`, {
      headers: { Authorization: `Bearer ${emptyMerchantToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      success: boolean;
      data: { revenue: number; orders: number; aov: number; unitsSold: number };
    };

    assert.equal(body.success, true);
    assert.equal(body.data.revenue, 0, 'Merchant B revenue must be 0');
    assert.equal(body.data.orders, 0, 'Merchant B orders must be 0');
    assert.equal(body.data.unitsSold, 0, 'Merchant B units sold must be 0');
  });
});

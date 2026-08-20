import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import Product, { ProductDocument } from '../src/models/product.model.js';
import User from '../src/models/user.model.js';
import { runSeed } from '../src/seed/seed.js';
import { calculateProductRisk } from '../src/services/inventory.service.js';

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
  await User.deleteMany({ email: 'm6_empty@example.com' });
  const emptyRegRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Empty Merchant M6', email: 'm6_empty@example.com', password: 'Password123!' }),
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

test('Milestone 6 — Inventory Intelligence Verification', async (t) => {
  await t.test('1. Unauthenticated inventory requests return 401 UNAUTHORIZED', async () => {
    const endpoints = ['/api/inventory/risks', '/api/inventory/summary'];
    for (const endpoint of endpoints) {
      const res = await fetch(`${baseUrl}${endpoint}`);
      assert.equal(res.status, 401);
      const body = (await res.json()) as { success: boolean; error: { code: string } };
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    }
  });

  await t.test('2. Invalid query parameters return 400 VALIDATION_ERROR', async () => {
    const invalidDaysRes = await fetch(`${baseUrl}/api/inventory/risks?lookbackDays=999`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(invalidDaysRes.status, 400);

    const invalidRiskRes = await fetch(`${baseUrl}/api/inventory/risks?riskLevel=super_critical`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(invalidRiskRes.status, 400);
  });

  await t.test('3. Verify exact spec checkpoint (Stock = 20, Daily Sales = 10 -> Stockout in 2 days, Critical)', () => {
    const mockProduct = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Product X',
      sku: 'TEST-PROD-X',
      category: 'Electronics',
      price: 100,
      costPrice: 50,
      stock: 20,
      reorderLevel: 10,
    } as unknown as ProductDocument;

    // 300 units sold in 30 days = 10 daily sales
    const riskItem = calculateProductRisk(mockProduct, 300, 30);

    assert.equal(riskItem.averageDailySales, 10);
    assert.equal(riskItem.estimatedDaysUntilStockout, 2);
    assert.equal(riskItem.riskLevel, 'critical');
    assert.equal(riskItem.reorderNeeded, true);
    assert.ok(riskItem.suggestedReorderQuantity > 0);
  });

  await t.test('4. Verify out-of-stock product handling (Stock = 0 -> Critical)', () => {
    const mockProduct = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Out of Stock Product',
      sku: 'TEST-PROD-ZERO',
      category: 'Electronics',
      price: 50,
      costPrice: 20,
      stock: 0,
      reorderLevel: 5,
    } as unknown as ProductDocument;

    const riskItem = calculateProductRisk(mockProduct, 10, 30);

    assert.equal(riskItem.stock, 0);
    assert.equal(riskItem.estimatedDaysUntilStockout, 0);
    assert.equal(riskItem.riskLevel, 'critical');
    assert.equal(riskItem.reorderNeeded, true);
  });

  await t.test('5. GET /api/inventory/risks returns paginated risk items sorted by severity', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/risks?lookbackDays=30&limit=10`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      success: boolean;
      data: Array<{ name: string; riskLevel: string; stock: number; reorderNeeded: boolean }>;
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };

    assert.equal(body.success, true);
    assert.equal(body.pagination.limit, 10);
    assert.ok(body.pagination.total >= 50, 'Total seeded products should be included in risk calculations');
    assert.ok(body.data.length <= 10);

    // Verify severity sorting (critical comes before high/medium/healthy)
    const severityMap: Record<string, number> = { critical: 1, high: 2, medium: 3, healthy: 4 };
    for (let i = 0; i < body.data.length - 1; i++) {
      const weightA = severityMap[body.data[i].riskLevel];
      const weightB = severityMap[body.data[i + 1].riskLevel];
      assert.ok(weightA <= weightB, 'Data must be sorted by risk severity');
    }
  });

  await t.test('6. GET /api/inventory/risks filters by riskLevel and reorderOnly', async () => {
    const criticalRes = await fetch(`${baseUrl}/api/inventory/risks?riskLevel=critical`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(criticalRes.status, 200);
    const criticalBody = (await criticalRes.json()) as {
      data: Array<{ riskLevel: string }>;
    };
    for (const item of criticalBody.data) {
      assert.equal(item.riskLevel, 'critical');
    }

    const reorderRes = await fetch(`${baseUrl}/api/inventory/risks?reorderOnly=true`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(reorderRes.status, 200);
    const reorderBody = (await reorderRes.json()) as {
      data: Array<{ reorderNeeded: boolean }>;
    };
    for (const item of reorderBody.data) {
      assert.equal(item.reorderNeeded, true);
    }
  });

  await t.test('7. GET /api/inventory/risks filters by search and category', async () => {
    const catRes = await fetch(`${baseUrl}/api/inventory/risks?category=Electronics`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(catRes.status, 200);
    const catBody = (await catRes.json()) as {
      data: Array<{ category: string }>;
    };
    for (const item of catBody.data) {
      assert.equal(item.category, 'Electronics');
    }
  });

  await t.test('8. GET /api/inventory/summary returns complete health metrics', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/summary?lookbackDays=30`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      success: boolean;
      data: {
        totalProducts: number;
        totalStockUnits: number;
        outOfStockCount: number;
        criticalRiskCount: number;
        reorderNeededCount: number;
        totalRetailValue: number;
        totalCostValue: number;
        lookbackDays: number;
      };
    };

    assert.equal(body.success, true);
    assert.equal(body.data.totalProducts, 50);
    assert.ok(body.data.totalStockUnits > 0);
    assert.ok(body.data.outOfStockCount >= 1, 'Seeded dataset contains out-of-stock items (e.g. ELEC-EARB-010)');
    assert.ok(body.data.criticalRiskCount >= 1);
    assert.ok(body.data.reorderNeededCount >= 1);
    assert.ok(body.data.totalRetailValue > body.data.totalCostValue, 'Total retail valuation must exceed cost valuation');
  });

  await t.test('9. Multi-Tenant Isolation — Merchant B receives 0 inventory items', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/summary`, {
      headers: { Authorization: `Bearer ${emptyMerchantToken}` },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      success: boolean;
      data: { totalProducts: number; totalStockUnits: number; totalRetailValue: number };
    };

    assert.equal(body.success, true);
    assert.equal(body.data.totalProducts, 0);
    assert.equal(body.data.totalStockUnits, 0);
    assert.equal(body.data.totalRetailValue, 0);
  });
});

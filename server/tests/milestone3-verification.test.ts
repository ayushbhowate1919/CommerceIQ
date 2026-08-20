import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import Product from '../src/models/product.model.js';
import User from '../src/models/user.model.js';

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

let userAToken = '';
let userBToken = '';
let userAId = '';
let userBId = '';

before(async () => {
  await connectDatabase();
  await User.deleteMany({ email: { $in: ['m3_usera@example.com', 'm3_userb@example.com'] } });

  server = app.listen(0);
  const address = server.address();
  if (address && typeof address === 'object') {
    baseUrl = `http://localhost:${address.port}`;
  }

  // Register User A
  const resA = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Merchant A', email: 'm3_usera@example.com', password: 'Password123!' }),
  });
  const dataA = (await resA.json()) as { success: boolean; data: { token: string; user: { id: string } } };
  userAToken = dataA.data.token;
  userAId = dataA.data.user.id;

  // Register User B
  const resB = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Merchant B', email: 'm3_userb@example.com', password: 'Password123!' }),
  });
  const dataB = (await resB.json()) as { success: boolean; data: { token: string; user: { id: string } } };
  userBToken = dataB.data.token;
  userBId = dataB.data.user.id;

  // Cleanup products created by these test merchants
  await Product.deleteMany({ merchant: { $in: [userAId, userBId] } });
});

after(async () => {
  await Product.deleteMany({ merchant: { $in: [userAId, userBId] } });
  await User.deleteMany({ email: { $in: ['m3_usera@example.com', 'm3_userb@example.com'] } });
  server.close();
  await mongoose.disconnect();
});

test('Milestone 3 — Product CRUD & Merchant Isolation Verification', async (t) => {
  let createdProductId = '';

  await t.test('1. Reject unauthenticated access', async () => {
    const res = await fetch(`${baseUrl}/api/products`);
    assert.equal(res.status, 401);
    const data = (await res.json()) as { success: boolean; error: { code: string } };
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'UNAUTHORIZED');
  });

  await t.test('2. Product Validation - Reject invalid payload (missing name, negative price)', async () => {
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        sku: 'TEST-SKU-BAD',
        category: 'Electronics',
        price: -10,
        costPrice: 50,
        stock: 5,
        reorderLevel: 2,
      }),
    });
    assert.equal(res.status, 400);
    const data = (await res.json()) as { success: boolean; error: { code: string } };
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'VALIDATION_ERROR');
  });

  await t.test('3. Create Product for Merchant A', async () => {
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        name: 'Wireless Ergonomic Mouse',
        sku: 'MS-W-001',
        category: 'Electronics',
        description: 'High precision wireless optical mouse.',
        price: 49.99,
        costPrice: 20.0,
        stock: 150,
        reorderLevel: 15,
        rating: 4.5,
        reviewCount: 12,
        status: 'active',
      }),
    });
    assert.equal(res.status, 201);
    const data = (await res.json()) as {
      success: boolean;
      data: { _id: string; name: string; sku: string; price: number; merchant: string };
    };
    assert.equal(data.success, true);
    assert.ok(data.data._id);
    assert.equal(data.data.name, 'Wireless Ergonomic Mouse');
    assert.equal(data.data.sku, 'MS-W-001');
    assert.equal(data.data.price, 49.99);
    assert.equal(data.data.merchant, userAId);
    createdProductId = data.data._id;
  });

  await t.test('4. Reject Duplicate SKU creation', async () => {
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        name: 'Duplicate Mouse',
        sku: 'MS-W-001',
        category: 'Electronics',
        price: 39.99,
        costPrice: 15.0,
        stock: 50,
        reorderLevel: 10,
      }),
    });
    assert.equal(res.status, 409);
    const data = (await res.json()) as { success: boolean; error: { code: string } };
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'SKU_ALREADY_EXISTS');
  });

  await t.test('5. Create Additional Products for Merchant A', async () => {
    const productsToCreate = [
      { name: 'Mechanical Keyboard RGB', sku: 'KB-RGB-002', category: 'Electronics', price: 99.99, costPrice: 45.0, stock: 40, reorderLevel: 10 },
      { name: 'Noise Cancelling Headphones', sku: 'HP-NC-003', category: 'Electronics', price: 199.99, costPrice: 90.0, stock: 25, reorderLevel: 5 },
      { name: 'Organic Cotton T-Shirt', sku: 'TS-ORG-004', category: 'Apparel', price: 24.99, costPrice: 8.0, stock: 200, reorderLevel: 30 },
    ];
    for (const prod of productsToCreate) {
      const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify(prod),
      });
      assert.equal(res.status, 201);
    }
  });

  await t.test('6. List Products with Pagination metadata for Merchant A', async () => {
    const res = await fetch(`${baseUrl}/api/products?page=1&limit=2`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.equal(res.status, 200);
    const data = (await res.json()) as {
      success: boolean;
      data: Array<{ name: string }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
    assert.equal(data.success, true);
    assert.equal(data.data.length, 2);
    assert.equal(data.pagination.page, 1);
    assert.equal(data.pagination.limit, 2);
    assert.equal(data.pagination.total, 4);
    assert.equal(data.pagination.totalPages, 2);
  });

  await t.test('7. Search Products by Name and SKU', async () => {
    const resName = await fetch(`${baseUrl}/api/products?search=Keyboard`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const dataName = (await resName.json()) as { success: boolean; data: Array<{ sku: string }> };
    assert.equal(dataName.data.length, 1);
    assert.equal(dataName.data[0].sku, 'KB-RGB-002');

    const resSku = await fetch(`${baseUrl}/api/products?search=HP-NC-003`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const dataSku = (await resSku.json()) as { success: boolean; data: Array<{ name: string }> };
    assert.equal(dataSku.data.length, 1);
    assert.equal(dataSku.data[0].name, 'Noise Cancelling Headphones');
  });

  await t.test('8. Filter Products by Category and Status', async () => {
    const resCat = await fetch(`${baseUrl}/api/products?category=Apparel`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const dataCat = (await resCat.json()) as { success: boolean; data: Array<{ name: string }> };
    assert.equal(dataCat.data.length, 1);
    assert.equal(dataCat.data[0].name, 'Organic Cotton T-Shirt');
  });

  await t.test('9. Read Single Product details', async () => {
    const res = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.equal(res.status, 200);
    const data = (await res.json()) as { success: boolean; data: { _id: string; sku: string } };
    assert.equal(data.success, true);
    assert.equal(data.data._id, createdProductId);
    assert.equal(data.data.sku, 'MS-W-001');
  });

  await t.test('10. Update Product details (PATCH)', async () => {
    const res = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        price: 54.99,
        stock: 140,
        description: 'Updated description.',
      }),
    });
    assert.equal(res.status, 200);
    const data = (await res.json()) as { success: boolean; data: { price: number; stock: number; description: string } };
    assert.equal(data.success, true);
    assert.equal(data.data.price, 54.99);
    assert.equal(data.data.stock, 140);
    assert.equal(data.data.description, 'Updated description.');
  });

  await t.test('11. Merchant Isolation - User B cannot access or modify User A product', async () => {
    // User B list products returns 0 products
    const resListB = await fetch(`${baseUrl}/api/products`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    const dataListB = (await resListB.json()) as { success: boolean; data: Array<unknown> };
    assert.equal(dataListB.data.length, 0);

    // User B get User A product by ID returns 404 NOT_FOUND
    const resGetB = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    assert.equal(resGetB.status, 404);

    // User B patch User A product returns 404 NOT_FOUND
    const resPatchB = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`,
      },
      body: JSON.stringify({ price: 1.0 }),
    });
    assert.equal(resPatchB.status, 404);

    // User B delete User A product returns 404 NOT_FOUND
    const resDeleteB = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    assert.equal(resDeleteB.status, 404);
  });

  await t.test('12. Delete Product for Merchant A', async () => {
    const resDelete = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.equal(resDelete.status, 200);

    // Verify product no longer exists
    const resGet = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.equal(resGet.status, 404);
  });
});

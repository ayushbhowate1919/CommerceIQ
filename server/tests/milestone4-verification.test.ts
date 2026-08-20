import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import Customer from '../src/models/customer.model.js';
import Order from '../src/models/order.model.js';
import Product from '../src/models/product.model.js';
import Review from '../src/models/review.model.js';
import User from '../src/models/user.model.js';
import { runSeed } from '../src/seed/seed.js';

let demoMerchantId: mongoose.Types.ObjectId;

before(async () => {
  await connectDatabase();
});

after(async () => {
  await mongoose.disconnect();
});

test('Milestone 4 — Seed Realistic Demo Data Verification', async (t) => {
  await t.test('1. Execute seed pipeline', async () => {
    await runSeed();
    const demoUser = await User.findOne({ email: 'demo@commerceiq.com' });
    assert.ok(demoUser, 'Demo merchant must exist');
    demoMerchantId = demoUser._id;
  });

  await t.test('2. Verify Product count target (50 products)', async () => {
    const count = await Product.countDocuments({ merchant: demoMerchantId });
    assert.equal(count, 50, 'Must seed exactly 50 products');
  });

  await t.test('3. Verify Customer count target (150 customers)', async () => {
    const count = await Customer.countDocuments({ merchant: demoMerchantId });
    assert.equal(count, 150, 'Must seed exactly 150 customers');
  });

  await t.test('4. Verify Order count target (1500 orders)', async () => {
    const count = await Order.countDocuments({ merchant: demoMerchantId });
    assert.equal(count, 1500, 'Must seed exactly 1500 orders');
  });

  await t.test('5. Verify Review count target (500 reviews)', async () => {
    const count = await Review.countDocuments({ merchant: demoMerchantId });
    assert.equal(count, 500, 'Must seed exactly 500 reviews');
  });

  await t.test('6. Verify Product rating and review count updates', async () => {
    const reviewedProducts = await Product.find({ merchant: demoMerchantId, reviewCount: { $gt: 0 } });
    assert.ok(reviewedProducts.length > 0, 'At least some products should have reviews');
    for (const prod of reviewedProducts) {
      assert.ok(prod.rating >= 1 && prod.rating <= 5, 'Rating must be between 1 and 5');
      assert.ok(prod.reviewCount > 0, 'Review count must be positive');
    }
  });

  await t.test('7. Verify Order date distribution and status breakdown', async () => {
    const orders = await Order.find({ merchant: demoMerchantId }).sort({ orderDate: 1 });
    assert.equal(orders.length, 1500);

    const oldestOrder = orders[0];
    const newestOrder = orders[orders.length - 1];
    const timeSpanDays = (newestOrder.orderDate.getTime() - oldestOrder.orderDate.getTime()) / (1000 * 60 * 60 * 24);

    assert.ok(timeSpanDays >= 60, 'Orders should span across several months (at least 60 days)');

    const statuses = await Order.distinct('status', { merchant: demoMerchantId });
    assert.ok(statuses.includes('delivered'), 'Should contain delivered orders');
    assert.ok(statuses.includes('pending') || statuses.includes('shipped'), 'Should contain active in-flight orders');
  });
});

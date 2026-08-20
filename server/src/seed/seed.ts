import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Customer from '../models/customer.model.js';
import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import Review from '../models/review.model.js';
import User from '../models/user.model.js';
import {
  CITIES,
  FIRST_NAMES,
  LAST_NAMES,
  RAW_PRODUCTS,
  REVIEW_TEMPLATES,
  type SeedCustomer,
} from './seed-data.js';

export async function runSeed(): Promise<void> {
  console.log('🌱 Starting CommerceIQ Seed Pipeline...');
  await connectDatabase();

  const demoEmail = 'demo@commerceiq.com';
  let demoMerchant = await User.findOne({ email: demoEmail });

  if (!demoMerchant) {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    demoMerchant = await User.create({
      name: 'Acro Commerce (Demo)',
      email: demoEmail,
      passwordHash,
      role: 'merchant',
    });
    console.log(`✅ Demo merchant account created: ${demoEmail}`);
  } else {
    console.log(`ℹ️  Found existing demo merchant: ${demoEmail}`);
  }

  const merchantId = demoMerchant._id;

  // Clean existing demo data for clean re-run
  console.log('🧹 Cleaning prior merchant data...');
  await Promise.all([
    Product.deleteMany({ merchant: merchantId }),
    Customer.deleteMany({ merchant: merchantId }),
    Order.deleteMany({ merchant: merchantId }),
    Review.deleteMany({ merchant: merchantId }),
  ]);

  // 1. Insert 50 Products
  console.log('📦 Seeding 50 Products...');
  const productDocsToInsert = RAW_PRODUCTS.map((prod) => ({
    merchant: merchantId,
    ...prod,
    rating: 0,
    reviewCount: 0,
  }));
  const createdProducts = await Product.insertMany(productDocsToInsert);
  console.log(`✅ Inserted ${createdProducts.length} Products`);

  // 2. Insert 150 Customers
  console.log('👥 Seeding 150 Customers...');
  const customerDocsToInsert: Array<SeedCustomer & { merchant: mongoose.Types.ObjectId }> = [];
  const segments: Array<'VIP' | 'Regular' | 'New' | 'At-Risk'> = ['VIP', 'Regular', 'New', 'At-Risk'];

  for (let i = 0; i < 150; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 3 + 1) % LAST_NAMES.length];
    const city = CITIES[i % CITIES.length];
    const segment = segments[i % segments.length];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@example.com`;

    customerDocsToInsert.push({
      merchant: merchantId,
      name: `${firstName} ${lastName}`,
      email,
      city,
      segment,
    });
  }

  const createdCustomers = await Customer.insertMany(customerDocsToInsert);
  console.log(`✅ Inserted ${createdCustomers.length} Customers`);

  // 3. Generate 1,500 Orders
  console.log('🛒 Seeding 1,500 Orders over last 90 days...');
  const orderDocsToInsert = [];
  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  for (let i = 1; i <= 1500; i++) {
    // Generate deterministic time curve with slight trend upward towards recent dates
    const randomFactor = Math.pow(Math.random(), 0.85); // skew slightly towards recent dates
    const orderTimestamp = now - Math.floor(randomFactor * ninetyDaysMs);
    const orderDate = new Date(orderTimestamp);

    const customerIndex = Math.floor(Math.random() * createdCustomers.length);
    const customer = createdCustomers[customerIndex];

    // Pick 1 to 4 items
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let subtotal = 0;

    const usedProductIndices = new Set<number>();
    for (let k = 0; k < itemCount; k++) {
      let prodIndex = Math.floor(Math.random() * createdProducts.length);
      while (usedProductIndices.has(prodIndex)) {
        prodIndex = (prodIndex + 1) % createdProducts.length;
      }
      usedProductIndices.add(prodIndex);

      const product = createdProducts[prodIndex];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const unitPrice = product.price;
      subtotal += unitPrice * quantity;

      items.push({
        productId: product._id,
        quantity,
        unitPrice,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    const discountRate = Math.random() < 0.25 ? 0.1 : 0; // 25% orders get 10% discount
    const discount = Math.round(subtotal * discountRate * 100) / 100;
    const totalAmount = Math.round((subtotal - discount) * 100) / 100;

    // Status assignment based on age
    const ageDays = (now - orderTimestamp) / (1000 * 60 * 60 * 24);
    let status = 'delivered';
    let paymentStatus = 'paid';

    if (ageDays < 2) {
      status = Math.random() < 0.7 ? 'pending' : 'confirmed';
      paymentStatus = Math.random() < 0.85 ? 'paid' : 'unpaid';
    } else if (ageDays < 7) {
      status = Math.random() < 0.5 ? 'shipped' : 'delivered';
      paymentStatus = 'paid';
    } else {
      const rand = Math.random();
      if (rand < 0.85) {
        status = 'delivered';
        paymentStatus = 'paid';
      } else if (rand < 0.90) {
        status = 'returned';
        paymentStatus = 'refunded';
      } else if (rand < 0.95) {
        status = 'cancelled';
        paymentStatus = 'unpaid';
      } else {
        status = 'shipped';
        paymentStatus = 'paid';
      }
    }

    orderDocsToInsert.push({
      merchant: merchantId,
      orderNumber: `ORD-${10000 + i}`,
      customerId: customer._id,
      items,
      subtotal,
      discount,
      totalAmount,
      status,
      paymentStatus,
      orderDate,
      createdAt: orderDate,
      updatedAt: orderDate,
    });
  }

  const createdOrders = await Order.insertMany(orderDocsToInsert);
  console.log(`✅ Inserted ${createdOrders.length} Orders`);

  // 4. Generate 500 Reviews
  console.log('⭐ Seeding 500 Customer Reviews...');
  const reviewDocsToInsert = [];
  const productRatingsMap: Record<string, { total: number; count: number }> = {};

  for (let i = 0; i < 500; i++) {
    const productIndex = Math.floor(Math.random() * createdProducts.length);
    const product = createdProducts[productIndex];

    const customerIndex = Math.floor(Math.random() * createdCustomers.length);
    const customer = createdCustomers[customerIndex];

    const templateIndex = Math.floor(Math.random() * REVIEW_TEMPLATES.length);
    const template = REVIEW_TEMPLATES[templateIndex];

    const prodIdStr = product._id.toString();
    if (!productRatingsMap[prodIdStr]) {
      productRatingsMap[prodIdStr] = { total: 0, count: 0 };
    }
    productRatingsMap[prodIdStr].total += template.rating;
    productRatingsMap[prodIdStr].count += 1;

    const randomDaysAgo = Math.floor(Math.random() * 80);
    const reviewDate = new Date(now - randomDaysAgo * 24 * 60 * 60 * 1000);

    reviewDocsToInsert.push({
      merchant: merchantId,
      productId: product._id,
      customerId: customer._id,
      rating: template.rating,
      text: template.text,
      verifiedPurchase: template.verifiedPurchase,
      aiAnalysis: template.aiAnalysis,
      createdAt: reviewDate,
      updatedAt: reviewDate,
    });
  }

  const createdReviews = await Review.insertMany(reviewDocsToInsert);
  console.log(`✅ Inserted ${createdReviews.length} Reviews`);

  // 5. Update Product rating and reviewCount
  console.log('🔄 Updating Product ratings and review counts...');
  const productUpdateOps = createdProducts.map((prod) => {
    const stats = productRatingsMap[prod._id.toString()];
    const count = stats?.count ?? 0;
    const avgRating = count > 0 ? Math.round((stats.total / count) * 10) / 10 : 0;
    return {
      updateOne: {
        filter: { _id: prod._id },
        update: { $set: { rating: avgRating, reviewCount: count } },
      },
    };
  });

  await Product.bulkWrite(productUpdateOps);
  console.log('✅ Updated Product rating statistics');

  // Summary Checkpoint
  console.log('\n=========================================');
  console.log('🎉 SEEDING COMPLETE — CHECKPOINT SUMMARY');
  console.log('=========================================');
  console.log(`Merchant: ${demoEmail}`);
  console.log(`Products: ${await Product.countDocuments({ merchant: merchantId })}`);
  console.log(`Customers: ${await Customer.countDocuments({ merchant: merchantId })}`);
  console.log(`Orders: ${await Order.countDocuments({ merchant: merchantId })}`);
  console.log(`Reviews: ${await Review.countDocuments({ merchant: merchantId })}`);
  console.log('=========================================\n');
}

// Execute standalone if called directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runSeed()
    .then(() => {
      console.log('Seed completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seed failed with error:', err);
      process.exit(1);
    });
}

import mongoose from 'mongoose';
import Order from '../models/order.model.js';
import {
  AnalyticsQueryInput,
  calculatePercentageChange,
  parseDateWindow,
} from '../validators/analytics.validator.js';

export interface DashboardSummaryResponse {
  revenue: number;
  orders: number;
  aov: number;
  unitsSold: number;
  revenueChange: number;
  ordersChange: number;
  aovChange: number;
  unitsSoldChange: number;
  dateWindow: {
    currentStart: string;
    currentEnd: string;
    previousStart: string;
    previousEnd: string;
  };
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  orders: number;
  aov: number;
}

export interface OrderSummaryResponse {
  totalOrders: number;
  grossRevenue: number;
  netRevenue: number;
  statusBreakdown: Record<string, number>;
}

export interface CategoryRevenuePoint {
  category: string;
  revenue: number;
  quantity: number;
  orderCount: number;
  percentageOfTotal: number;
}

export interface TopProductPoint {
  productId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  revenue: number;
  quantity: number;
}

export interface ProductPerformancePoint {
  productId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  reorderLevel: number;
  rating: number;
  reviewCount: number;
  unitsSold: number;
  revenue: number;
}

async function aggregatePeriodMetrics(merchantObjectId: mongoose.Types.ObjectId, startDate: Date, endDate: Date) {
  const pipeline = [
    {
      $match: {
        merchant: merchantObjectId,
        orderDate: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' },
      },
    },
    {
      $unwind: '$items',
    },
    {
      $group: {
        _id: '$_id',
        totalAmount: { $first: '$totalAmount' },
        itemQuantity: { $sum: '$items.quantity' },
      },
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
        unitsSold: { $sum: '$itemQuantity' },
      },
    },
  ];

  const result = await Order.aggregate<{ _id: null; revenue: number; orders: number; unitsSold: number }>(pipeline);

  if (!result || result.length === 0) {
    return { revenue: 0, orders: 0, aov: 0, unitsSold: 0 };
  }

  const { revenue, orders, unitsSold } = result[0];
  const aov = orders > 0 ? Math.round((revenue / orders) * 100) / 100 : 0;

  return {
    revenue: Math.round(revenue * 100) / 100,
    orders,
    aov,
    unitsSold,
  };
}

export async function getDashboardSummary(
  merchantId: string,
  query: AnalyticsQueryInput,
): Promise<DashboardSummaryResponse> {
  const merchantObjectId = new mongoose.Types.ObjectId(merchantId);
  const window = parseDateWindow(query);

  const [current, previous] = await Promise.all([
    aggregatePeriodMetrics(merchantObjectId, window.currentStart, window.currentEnd),
    aggregatePeriodMetrics(merchantObjectId, window.previousStart, window.previousEnd),
  ]);

  return {
    revenue: current.revenue,
    orders: current.orders,
    aov: current.aov,
    unitsSold: current.unitsSold,
    revenueChange: calculatePercentageChange(current.revenue, previous.revenue),
    ordersChange: calculatePercentageChange(current.orders, previous.orders),
    aovChange: calculatePercentageChange(current.aov, previous.aov),
    unitsSoldChange: calculatePercentageChange(current.unitsSold, previous.unitsSold),
    dateWindow: {
      currentStart: window.currentStart.toISOString(),
      currentEnd: window.currentEnd.toISOString(),
      previousStart: window.previousStart.toISOString(),
      previousEnd: window.previousEnd.toISOString(),
    },
  };
}

export async function getRevenueTrend(
  merchantId: string,
  query: AnalyticsQueryInput,
): Promise<RevenueTrendPoint[]> {
  const merchantObjectId = new mongoose.Types.ObjectId(merchantId);
  const window = parseDateWindow(query);

  let dateFormat = '%Y-%m-%d';
  if (query.interval === 'week') {
    dateFormat = '%G-W%V';
  } else if (query.interval === 'month') {
    dateFormat = '%Y-%m';
  } else if (!query.interval) {
    const range = query.range ?? '30d';
    if (range === '90d') {
      dateFormat = '%G-W%V';
    } else if (range === '12m') {
      dateFormat = '%Y-%m';
    }
  }

  const pipeline = [
    {
      $match: {
        merchant: merchantObjectId,
        orderDate: { $gte: window.currentStart, $lte: window.currentEnd },
        status: { $ne: 'cancelled' },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$orderDate' } },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 as const },
    },
  ];

  const results = await Order.aggregate<{ _id: string; revenue: number; orders: number }>(pipeline);

  return results.map((item) => ({
    date: item._id,
    revenue: Math.round(item.revenue * 100) / 100,
    orders: item.orders,
    aov: item.orders > 0 ? Math.round((item.revenue / item.orders) * 100) / 100 : 0,
  }));
}

export async function getOrderSummary(
  merchantId: string,
  query: AnalyticsQueryInput,
): Promise<OrderSummaryResponse> {
  const merchantObjectId = new mongoose.Types.ObjectId(merchantId);
  const window = parseDateWindow(query);

  const pipeline = [
    {
      $match: {
        merchant: merchantObjectId,
        orderDate: { $gte: window.currentStart, $lte: window.currentEnd },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
      },
    },
  ];

  const results = await Order.aggregate<{ _id: string; count: number; totalRevenue: number }>(pipeline);

  const statusBreakdown: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
  };

  let totalOrders = 0;
  let grossRevenue = 0;
  let netRevenue = 0;

  for (const item of results) {
    statusBreakdown[item._id] = item.count;
    totalOrders += item.count;
    grossRevenue += item.totalRevenue;
    if (item._id !== 'cancelled') {
      netRevenue += item.totalRevenue;
    }
  }

  return {
    totalOrders,
    grossRevenue: Math.round(grossRevenue * 100) / 100,
    netRevenue: Math.round(netRevenue * 100) / 100,
    statusBreakdown,
  };
}

export async function getCategoryRevenue(
  merchantId: string,
  query: AnalyticsQueryInput,
): Promise<CategoryRevenuePoint[]> {
  const merchantObjectId = new mongoose.Types.ObjectId(merchantId);
  const window = parseDateWindow(query);

  const pipeline = [
    {
      $match: {
        merchant: merchantObjectId,
        orderDate: { $gte: window.currentStart, $lte: window.currentEnd },
        status: { $ne: 'cancelled' },
      },
    },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.productId',
        foreignField: '_id',
        as: 'productInfo',
      },
    },
    { $unwind: '$productInfo' },
    {
      $group: {
        _id: '$productInfo.category',
        revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
        quantity: { $sum: '$items.quantity' },
        orderIds: { $addToSet: '$_id' },
      },
    },
    {
      $project: {
        category: '$_id',
        revenue: 1,
        quantity: 1,
        orderCount: { $size: '$orderIds' },
      },
    },
    { $sort: { revenue: -1 as const } },
  ];

  const results = await Order.aggregate<{
    category: string;
    revenue: number;
    quantity: number;
    orderCount: number;
  }>(pipeline);

  const totalStoreRevenue = results.reduce((sum, item) => sum + item.revenue, 0);

  return results.map((item) => ({
    category: item.category,
    revenue: Math.round(item.revenue * 100) / 100,
    quantity: item.quantity,
    orderCount: item.orderCount,
    percentageOfTotal:
      totalStoreRevenue > 0 ? Math.round((item.revenue / totalStoreRevenue) * 1000) / 10 : 0,
  }));
}

export async function getTopProducts(
  merchantId: string,
  query: AnalyticsQueryInput,
): Promise<TopProductPoint[]> {
  const merchantObjectId = new mongoose.Types.ObjectId(merchantId);
  const window = parseDateWindow(query);
  const limit = query.limit ?? 5;
  const sortField = query.sortBy === 'quantity' ? 'quantity' : 'revenue';

  const pipeline = [
    {
      $match: {
        merchant: merchantObjectId,
        orderDate: { $gte: window.currentStart, $lte: window.currentEnd },
        status: { $ne: 'cancelled' },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
        quantity: { $sum: '$items.quantity' },
      },
    },
    { $sort: { [sortField]: -1 as const } },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productInfo',
      },
    },
    { $unwind: '$productInfo' },
    {
      $project: {
        productId: { $toString: '$_id' },
        name: '$productInfo.name',
        sku: '$productInfo.sku',
        category: '$productInfo.category',
        price: '$productInfo.price',
        stock: '$productInfo.stock',
        revenue: 1,
        quantity: 1,
      },
    },
  ];

  const results = await Order.aggregate<TopProductPoint>(pipeline);
  return results.map((item) => ({
    ...item,
    revenue: Math.round(item.revenue * 100) / 100,
  }));
}

export async function getPeriodComparison(
  merchantId: string,
  query: AnalyticsQueryInput,
) {
  const summary = await getDashboardSummary(merchantId, query);
  const window = parseDateWindow(query);

  const [currentCategories, previousCategories] = await Promise.all([
    getCategoryRevenue(merchantId, { startDate: window.currentStart.toISOString(), endDate: window.currentEnd.toISOString() }),
    getCategoryRevenue(merchantId, { startDate: window.previousStart.toISOString(), endDate: window.previousEnd.toISOString() }),
  ]);

  return {
    summary,
    categories: {
      current: currentCategories,
      previous: previousCategories,
    },
  };
}

export async function getProductPerformance(
  merchantId: string,
  query: AnalyticsQueryInput,
): Promise<ProductPerformancePoint[]> {
  const merchantObjectId = new mongoose.Types.ObjectId(merchantId);
  const window = parseDateWindow(query);

  const pipeline = [
    {
      $match: {
        merchant: merchantObjectId,
        orderDate: { $gte: window.currentStart, $lte: window.currentEnd },
        status: { $ne: 'cancelled' },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
      },
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productInfo',
      },
    },
    { $unwind: '$productInfo' },
    {
      $project: {
        productId: { $toString: '$_id' },
        name: '$productInfo.name',
        sku: '$productInfo.sku',
        category: '$productInfo.category',
        price: '$productInfo.price',
        costPrice: '$productInfo.costPrice',
        stock: '$productInfo.stock',
        reorderLevel: '$productInfo.reorderLevel',
        rating: '$productInfo.rating',
        reviewCount: '$productInfo.reviewCount',
        unitsSold: 1,
        revenue: 1,
      },
    },
    { $sort: { revenue: -1 as const } },
  ];

  const results = await Order.aggregate<ProductPerformancePoint>(pipeline);
  return results.map((item) => ({
    ...item,
    revenue: Math.round(item.revenue * 100) / 100,
  }));
}

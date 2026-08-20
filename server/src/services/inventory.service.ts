import mongoose from 'mongoose';
import Order from '../models/order.model.js';
import Product, { ProductDocument } from '../models/product.model.js';
import { InventoryQueryInput, InventoryRiskLevel } from '../validators/inventory.validator.js';

export interface InventoryRiskItem {
  productId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  reorderLevel: number;
  quantitySold: number;
  averageDailySales: number;
  estimatedDaysUntilStockout: number | null;
  riskLevel: InventoryRiskLevel;
  reorderNeeded: boolean;
  suggestedReorderQuantity: number;
}

export interface InventoryRisksResponse {
  data: InventoryRiskItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InventorySummaryResponse {
  totalProducts: number;
  totalStockUnits: number;
  outOfStockCount: number;
  criticalRiskCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  healthyCount: number;
  reorderNeededCount: number;
  totalRetailValue: number;
  totalCostValue: number;
  lookbackDays: number;
}

const RISK_SEVERITY_WEIGHTS: Record<InventoryRiskLevel, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  healthy: 4,
};

export function calculateProductRisk(
  product: ProductDocument,
  quantitySold: number,
  lookbackDays: number,
): InventoryRiskItem {
  const averageDailySales = Math.round((quantitySold / lookbackDays) * 100) / 100;
  let estimatedDaysUntilStockout: number | null = null;
  let riskLevel: InventoryRiskLevel = 'healthy';

  if (product.stock === 0) {
    estimatedDaysUntilStockout = 0;
    riskLevel = 'critical';
  } else if (averageDailySales > 0) {
    const days = Math.round((product.stock / averageDailySales) * 10) / 10;
    estimatedDaysUntilStockout = days;
    if (days <= 3) {
      riskLevel = 'critical';
    } else if (days <= 7) {
      riskLevel = 'high';
    } else if (days <= 14) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'healthy';
    }
  } else {
    estimatedDaysUntilStockout = null;
    riskLevel = product.stock <= product.reorderLevel ? 'high' : 'healthy';
  }

  const reorderNeeded =
    product.stock <= product.reorderLevel || riskLevel === 'critical' || riskLevel === 'high';

  let suggestedReorderQuantity = 0;
  if (reorderNeeded) {
    const targetStock = Math.max(
      Math.ceil(averageDailySales * 30),
      product.reorderLevel * 2,
    );
    suggestedReorderQuantity = Math.max(0, targetStock - product.stock);
  }

  return {
    productId: product._id.toString(),
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: product.price,
    costPrice: product.costPrice,
    stock: product.stock,
    reorderLevel: product.reorderLevel,
    quantitySold,
    averageDailySales,
    estimatedDaysUntilStockout,
    riskLevel,
    reorderNeeded,
    suggestedReorderQuantity,
  };
}

async function getSalesMapByMerchant(
  merchantObjectId: mongoose.Types.ObjectId,
  startDate: Date,
): Promise<Record<string, number>> {
  const pipeline = [
    {
      $match: {
        merchant: merchantObjectId,
        orderDate: { $gte: startDate },
        status: { $ne: 'cancelled' },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        totalQuantity: { $sum: '$items.quantity' },
      },
    },
  ];

  const results = await Order.aggregate<{ _id: mongoose.Types.ObjectId; totalQuantity: number }>(pipeline);
  const salesMap: Record<string, number> = {};
  for (const item of results) {
    salesMap[item._id.toString()] = item.totalQuantity;
  }
  return salesMap;
}

export async function getInventoryRisks(
  merchantId: string,
  query: InventoryQueryInput,
): Promise<InventoryRisksResponse> {
  const merchantObjectId = new mongoose.Types.ObjectId(merchantId);
  const lookbackDays = query.lookbackDays ?? 30;
  const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const [salesMap, products] = await Promise.all([
    getSalesMapByMerchant(merchantObjectId, startDate),
    Product.find({ merchant: merchantObjectId }),
  ]);

  let items: InventoryRiskItem[] = products.map((prod) => {
    const quantitySold = salesMap[prod._id.toString()] ?? 0;
    return calculateProductRisk(prod, quantitySold, lookbackDays);
  });

  // Apply filters
  if (query.riskLevel) {
    items = items.filter((item) => item.riskLevel === query.riskLevel);
  }

  if (query.reorderOnly) {
    items = items.filter((item) => item.reorderNeeded);
  }

  if (query.category) {
    const catLower = query.category.toLowerCase();
    items = items.filter((item) => item.category.toLowerCase().includes(catLower));
  }

  if (query.search) {
    const sLower = query.search.toLowerCase();
    items = items.filter(
      (item) => item.name.toLowerCase().includes(sLower) || item.sku.toLowerCase().includes(sLower),
    );
  }

  // Sort by risk severity then stock ascending
  items.sort((a, b) => {
    const weightDiff = RISK_SEVERITY_WEIGHTS[a.riskLevel] - RISK_SEVERITY_WEIGHTS[b.riskLevel];
    if (weightDiff !== 0) return weightDiff;
    return a.stock - b.stock;
  });

  // Pagination
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const total = items.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedData = items.slice(startIndex, startIndex + limit);

  return {
    data: paginatedData,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function getInventorySummary(
  merchantId: string,
  query: InventoryQueryInput,
): Promise<InventorySummaryResponse> {
  const merchantObjectId = new mongoose.Types.ObjectId(merchantId);
  const lookbackDays = query.lookbackDays ?? 30;
  const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const [salesMap, products] = await Promise.all([
    getSalesMapByMerchant(merchantObjectId, startDate),
    Product.find({ merchant: merchantObjectId }),
  ]);

  let totalProducts = 0;
  let totalStockUnits = 0;
  let outOfStockCount = 0;
  let criticalRiskCount = 0;
  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let healthyCount = 0;
  let reorderNeededCount = 0;
  let totalRetailValue = 0;
  let totalCostValue = 0;

  for (const prod of products) {
    totalProducts += 1;
    totalStockUnits += prod.stock;
    totalRetailValue += prod.stock * prod.price;
    totalCostValue += prod.stock * prod.costPrice;

    if (prod.stock === 0) {
      outOfStockCount += 1;
    }

    const quantitySold = salesMap[prod._id.toString()] ?? 0;
    const riskItem = calculateProductRisk(prod, quantitySold, lookbackDays);

    if (riskItem.riskLevel === 'critical') criticalRiskCount += 1;
    else if (riskItem.riskLevel === 'high') highRiskCount += 1;
    else if (riskItem.riskLevel === 'medium') mediumRiskCount += 1;
    else healthyCount += 1;

    if (riskItem.reorderNeeded) reorderNeededCount += 1;
  }

  return {
    totalProducts,
    totalStockUnits,
    outOfStockCount,
    criticalRiskCount,
    highRiskCount,
    mediumRiskCount,
    healthyCount,
    reorderNeededCount,
    totalRetailValue: Math.round(totalRetailValue * 100) / 100,
    totalCostValue: Math.round(totalCostValue * 100) / 100,
    lookbackDays,
  };
}

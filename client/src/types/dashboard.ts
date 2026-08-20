export type DateRangePreset = '7d' | '30d' | '90d' | '12m';

export type DashboardSummary = {
  revenue: number;
  orders: number;
  aov: number;
  unitsSold: number;
  revenueChange?: number;
  ordersChange?: number;
  aovChange?: number;
  unitsSoldChange?: number;
  periodChange?: {
    revenue: number;
    orders: number;
    aov: number;
    unitsSold: number;
  };
};

export type RevenueTrendItem = {
  date: string;
  revenue: number;
  orders: number;
  aov: number;
};

export type CategoryRevenueItem = {
  category: string;
  revenue: number;
  quantity?: number;
  unitsSold?: number;
  percentageOfTotal?: number;
  percentageShare?: number;
};

export type TopProductItem = {
  productId: string;
  name: string;
  sku: string;
  category: string;
  revenue: number;
  quantity?: number;
  unitsSold?: number;
  orderCount?: number;
  stock: number;
};

export type OrderSummaryStatusItem = {
  status: string;
  count: number;
  grossRevenue: number;
};

export type OrderSummary = {
  statuses: OrderSummaryStatusItem[];
  totalOrders: number;
  grossRevenue: number;
  netRevenue: number;
};

export type InventorySummary = {
  totalProducts: number;
  totalUnits?: number;
  totalStockUnits?: number;
  outOfStockCount: number;
  criticalRiskCount: number;
  totalValuation?: number;
  totalRetailValue?: number;
  totalCostValue?: number;
};

export type InventoryRiskItem = {
  productId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  reorderLevel: number;
  lookbackDays?: number;
  quantitySold: number;
  averageDailySales: number;
  estimatedDaysUntilStockout: number | null;
  riskLevel: 'critical' | 'high' | 'medium' | 'healthy';
  reorderNeeded: boolean;
  suggestedReorderQuantity: number;
  product?: {
    _id: string;
    name: string;
    sku: string;
    category: string;
    stock: number;
    reorderLevel: number;
    price: number;
    status: string;
  };
};

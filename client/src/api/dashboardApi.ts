import { request, type PaginationMetadata } from './client';
import type {
  CategoryRevenueItem,
  DashboardSummary,
  DateRangePreset,
  InventoryRiskItem,
  InventorySummary,
  OrderSummary,
  RevenueTrendItem,
  TopProductItem,
} from '../types/dashboard';

export async function fetchDashboardSummary(range: DateRangePreset = '30d'): Promise<DashboardSummary> {
  const res = await request<DashboardSummary>(`/dashboard/summary?range=${range}`);
  return res.data;
}

export async function fetchRevenueTrend(
  range: DateRangePreset = '30d',
  interval?: 'day' | 'week' | 'month',
): Promise<RevenueTrendItem[]> {
  const params = new URLSearchParams({ range });
  if (interval) params.set('interval', interval);
  const res = await request<RevenueTrendItem[]>(`/analytics/revenue?${params.toString()}`);
  return res.data;
}

export async function fetchCategoryRevenue(range: DateRangePreset = '30d'): Promise<CategoryRevenueItem[]> {
  const res = await request<CategoryRevenueItem[]>(`/analytics/categories?range=${range}`);
  return res.data;
}

export async function fetchTopProducts(
  range: DateRangePreset = '30d',
  limit = 5,
  sortBy: 'revenue' | 'quantity' = 'revenue',
): Promise<TopProductItem[]> {
  const params = new URLSearchParams({ range, limit: String(limit), sortBy });
  const res = await request<TopProductItem[]>(`/analytics/top-products?${params.toString()}`);
  return res.data;
}

export async function fetchOrderSummary(range: DateRangePreset = '30d'): Promise<OrderSummary> {
  const res = await request<OrderSummary>(`/analytics/order-summary?range=${range}`);
  return res.data;
}

export async function fetchInventorySummary(): Promise<InventorySummary> {
  const res = await request<InventorySummary>('/inventory/summary');
  return res.data;
}

export async function fetchInventoryRisks(options: {
  lookbackDays?: number;
  riskLevel?: string;
  reorderOnly?: boolean;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: InventoryRiskItem[]; pagination?: PaginationMetadata }> {
  const params = new URLSearchParams();
  if (options.lookbackDays) params.set('lookbackDays', String(options.lookbackDays));
  if (options.riskLevel) params.set('riskLevel', options.riskLevel);
  if (options.reorderOnly) params.set('reorderOnly', 'true');
  if (options.category) params.set('category', options.category);
  if (options.search) params.set('search', options.search);
  if (options.page) params.set('page', String(options.page));
  if (options.limit) params.set('limit', String(options.limit));

  const res = await request<InventoryRiskItem[]>(`/inventory/risks?${params.toString()}`);
  return { data: res.data, pagination: res.pagination };
}

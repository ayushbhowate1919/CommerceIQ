import { useEffect, useState } from 'react';
import {
  fetchCategoryRevenue,
  fetchDashboardSummary,
  fetchInventoryRisks,
  fetchInventorySummary,
  fetchRevenueTrend,
  fetchTopProducts,
} from '../api/dashboardApi';
import { CategoryBreakdownChart } from '../components/dashboard/CategoryBreakdownChart';
import { DateRangeSelector } from '../components/dashboard/DateRangeSelector';
import { InventoryRiskWidget } from '../components/dashboard/InventoryRiskWidget';
import { KpiCards } from '../components/dashboard/KpiCards';
import { RevenueTrendChart } from '../components/dashboard/RevenueTrendChart';
import { TopProductsWidget } from '../components/dashboard/TopProductsWidget';
import type {
  CategoryRevenueItem,
  DashboardSummary,
  DateRangePreset,
  InventoryRiskItem,
  InventorySummary,
  RevenueTrendItem,
  TopProductItem,
} from '../types/dashboard';

export function DashboardPage() {
  const [range, setRange] = useState<DateRangePreset>('30d');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendItem[]>([]);
  const [categories, setCategories] = useState<CategoryRevenueItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null);
  const [inventoryRisks, setInventoryRisks] = useState<InventoryRiskItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');

    Promise.all([
      fetchDashboardSummary(range),
      fetchRevenueTrend(range),
      fetchCategoryRevenue(range),
      fetchTopProducts(range, 5),
      fetchInventorySummary(),
      fetchInventoryRisks({ limit: 10 }),
    ])
      .then(([sumData, trendData, catData, topProdData, invSumData, invRisksData]) => {
        if (!isMounted) return;
        setSummary(sumData);
        setRevenueTrend(trendData);
        setCategories(catData);
        setTopProducts(topProdData);
        setInventorySummary(invSumData);
        setInventoryRisks(invRisksData.data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [range]);

  return (
    <div className="dashboard-page">
      <div className="page-header flex-header">
        <div>
          <h1 className="page-title">Merchant Intelligence Dashboard</h1>
          <p className="page-subtitle">Real-time revenue analytics, sales trends, and inventory intelligence</p>
        </div>
        <DateRangeSelector selectedRange={range} onRangeChange={setRange} disabled={loading} />
      </div>

      {error && <div className="alert-error" role="alert">{error}</div>}

      <KpiCards summary={summary} loading={loading} />

      <div className="dashboard-grid-2col">
        <RevenueTrendChart data={revenueTrend} loading={loading} />
        <CategoryBreakdownChart data={categories} loading={loading} />
      </div>

      <div className="dashboard-grid-2col">
        <TopProductsWidget products={topProducts} loading={loading} />
        <InventoryRiskWidget summary={inventorySummary} risks={inventoryRisks} loading={loading} />
      </div>
    </div>
  );
}

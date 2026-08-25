import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateBusinessAdvisorApi, getLatestBusinessAdvisorApi } from '../api/aiApi';
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
import type { BusinessAdvisorResult } from '../types/ai';
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

  // AI Advisor State
  const [advisorInsight, setAdvisorInsight] = useState<BusinessAdvisorResult | null>(null);
  const [analyzingAdvisor, setAnalyzingAdvisor] = useState(false);

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
      getLatestBusinessAdvisorApi().catch(() => null),
    ])
      .then(([sumData, trendData, catData, topProdData, invSumData, invRisksData, advisorRes]) => {
        if (!isMounted) return;
        setSummary(sumData);
        setRevenueTrend(trendData);
        setCategories(catData);
        setTopProducts(topProdData);
        setInventorySummary(invSumData);
        setInventoryRisks(invRisksData.data);
        if (advisorRes) setAdvisorInsight(advisorRes);
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

  const handleRunAdvisorFromDashboard = async () => {
    setAnalyzingAdvisor(true);
    try {
      const res = await generateBusinessAdvisorApi(range, true);
      setAdvisorInsight(res);
    } catch {
      /* fallback silently or navigate */
    } finally {
      setAnalyzingAdvisor(false);
    }
  };

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

      {/* AI Business Insights Highlights Card */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: '#ffffff', borderRadius: '0.75rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.2rem' }}>⚡</span>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.15rem' }}>AI Business Advisor Intelligence</h3>
              {advisorInsight && (
                <span
                  style={{
                    backgroundColor: advisorInsight.healthScore >= 75 ? '#166534' : '#854d0e',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '1rem',
                    fontWeight: 700,
                  }}
                >
                  Health Score: {advisorInsight.healthScore}/100
                </span>
              )}
            </div>
            <p style={{ margin: 0, color: '#c7d2fe', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {advisorInsight
                ? advisorInsight.executiveSummary
                : 'Generate automated AI business strategy summaries, growth drivers, and stockout warnings grounded in real store metrics.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="btn"
              onClick={() => void handleRunAdvisorFromDashboard()}
              disabled={analyzingAdvisor}
              style={{ backgroundColor: '#6366f1', color: '#ffffff', border: 'none', fontWeight: 600, fontSize: '0.875rem' }}
            >
              {analyzingAdvisor ? 'Analyzing Store…' : '⚡ Analyze My Business'}
            </button>
            <Link
              to="/ai/business-advisor"
              className="btn"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.25)', fontSize: '0.875rem' }}
            >
              Full Advisor Studio →
            </Link>
          </div>
        </div>
      </div>

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

import type { DashboardSummary } from '../../types/dashboard';

type KpiCardsProps = {
  summary: DashboardSummary | null;
  loading: boolean;
};

export function KpiCards({ summary, loading }: KpiCardsProps) {
  if (loading || !summary) {
    return (
      <div className="kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi-card skeleton-card">
            <div className="skeleton-title"></div>
            <div className="skeleton-value"></div>
            <div className="skeleton-sub"></div>
          </div>
        ))}
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const formatNumber = (val: number) => new Intl.NumberFormat('en-US').format(val);

  const renderBadge = (change: number | undefined) => {
    const safeChange = typeof change === 'number' && !isNaN(change) ? change : 0;
    const isPositive = safeChange >= 0;
    const sign = isPositive ? '+' : '';
    return (
      <span className={`kpi-change-badge ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? '↑' : '↓'} {sign}
        {safeChange.toFixed(1)}%
      </span>
    );
  };

  const revenueChange = summary.revenueChange ?? summary.periodChange?.revenue ?? 0;
  const ordersChange = summary.ordersChange ?? summary.periodChange?.orders ?? 0;
  const aovChange = summary.aovChange ?? summary.periodChange?.aov ?? 0;
  const unitsSoldChange = summary.unitsSoldChange ?? summary.periodChange?.unitsSold ?? 0;

  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Total Revenue</span>
          <span className="kpi-icon">💰</span>
        </div>
        <div className="kpi-value">{formatCurrency(summary.revenue ?? 0)}</div>
        <div className="kpi-footer">
          {renderBadge(revenueChange)}
          <span className="kpi-subtext">vs previous period</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Total Orders</span>
          <span className="kpi-icon">🛍️</span>
        </div>
        <div className="kpi-value">{formatNumber(summary.orders ?? 0)}</div>
        <div className="kpi-footer">
          {renderBadge(ordersChange)}
          <span className="kpi-subtext">vs previous period</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Average Order Value</span>
          <span className="kpi-icon">📈</span>
        </div>
        <div className="kpi-value">{formatCurrency(summary.aov ?? 0)}</div>
        <div className="kpi-footer">
          {renderBadge(aovChange)}
          <span className="kpi-subtext">vs previous period</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Units Sold</span>
          <span className="kpi-icon">📦</span>
        </div>
        <div className="kpi-value">{formatNumber(summary.unitsSold ?? 0)}</div>
        <div className="kpi-footer">
          {renderBadge(unitsSoldChange)}
          <span className="kpi-subtext">vs previous period</span>
        </div>
      </div>
    </div>
  );
}

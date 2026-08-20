import { Link } from 'react-router-dom';
import type { TopProductItem } from '../../types/dashboard';

type TopProductsWidgetProps = {
  products: TopProductItem[];
  loading: boolean;
};

export function TopProductsWidget({ products, loading }: TopProductsWidgetProps) {
  if (loading) {
    return (
      <div className="card loading-state">
        <div className="skeleton-title"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const maxRevenue = products.length > 0 ? Math.max(...products.map((p) => p.revenue)) : 1;

  return (
    <div className="card">
      <div className="widget-header">
        <div>
          <h3>Top 5 Products</h3>
          <p className="widget-subtitle">Best sellers ranked by gross revenue</p>
        </div>
        <Link to="/products" className="link-action">
          View All →
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="empty-widget">No product sales recorded for this period.</div>
      ) : (
        <div className="top-products-list">
          {products.map((p, idx) => {
            const percentage = Math.min(100, Math.round((p.revenue / maxRevenue) * 100));
            const units = p.quantity ?? p.unitsSold ?? 0;
            return (
              <div key={p.productId} className="top-product-item">
                <div className="rank-badge">{idx + 1}</div>
                <div className="product-info-col">
                  <div className="product-title-row">
                    <Link to={`/products/${p.productId}`} className="product-name-link">
                      {p.name}
                    </Link>
                    <span className="product-sku">({p.sku})</span>
                  </div>
                  <div className="product-progress-track">
                    <div className="product-progress-bar" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
                <div className="product-stats-col">
                  <span className="product-revenue">{formatCurrency(p.revenue)}</span>
                  <span className="product-units">{units} units</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

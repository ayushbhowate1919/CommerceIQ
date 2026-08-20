import { Link } from 'react-router-dom';
import type { InventoryRiskItem, InventorySummary } from '../../types/dashboard';

type InventoryRiskWidgetProps = {
  summary: InventorySummary | null;
  risks: InventoryRiskItem[];
  loading: boolean;
};

export function InventoryRiskWidget({ summary, risks, loading }: InventoryRiskWidgetProps) {
  if (loading) {
    return (
      <div className="card loading-state">
        <div className="skeleton-title"></div>
        <div className="skeleton-line"></div>
      </div>
    );
  }

  const criticalAndHigh = risks.filter((r) => r.riskLevel === 'critical' || r.riskLevel === 'high').slice(0, 5);

  const getBadgeClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'badge-risk critical';
      case 'high':
        return 'badge-risk high';
      case 'medium':
        return 'badge-risk medium';
      default:
        return 'badge-risk healthy';
    }
  };

  const totalValuation = summary?.totalRetailValue ?? summary?.totalValuation ?? 0;

  return (
    <div className="card">
      <div className="widget-header">
        <div>
          <h3>Inventory Risk Overview</h3>
          <p className="widget-subtitle">Products requiring stock replenishment</p>
        </div>
        <Link to="/inventory" className="link-action">
          Manage Inventory →
        </Link>
      </div>

      <div className="inventory-stats-strip">
        <div className="stat-pill">
          <span className="stat-label">Out of Stock:</span>
          <span className="stat-val danger">{summary?.outOfStockCount ?? 0}</span>
        </div>
        <div className="stat-pill">
          <span className="stat-label">Critical Risk (0-3d):</span>
          <span className="stat-val warning">{summary?.criticalRiskCount ?? 0}</span>
        </div>
        <div className="stat-pill">
          <span className="stat-label">Total Stock Valuation:</span>
          <span className="stat-val">
            ${new Intl.NumberFormat('en-US').format(Math.round(totalValuation))}
          </span>
        </div>
      </div>

      {criticalAndHigh.length === 0 ? (
        <div className="empty-widget success-state">
          <span>✅ All products have healthy inventory levels!</span>
        </div>
      ) : (
        <div className="table-container compact">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Current Stock</th>
                <th>Daily Sales</th>
                <th>Stockout Projection</th>
                <th>Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {criticalAndHigh.map((item) => {
                const id = item.productId ?? item.product?._id ?? '';
                const name = item.name ?? item.product?.name ?? 'Unknown Product';
                const stock = item.stock ?? item.product?.stock ?? 0;

                return (
                  <tr key={id || name}>
                    <td>
                      {id ? (
                        <Link to={`/products/${id}`} className="product-name-link">
                          {name}
                        </Link>
                      ) : (
                        <span>{name}</span>
                      )}
                    </td>
                    <td>
                      <span className="stock-count-highlight">{stock}</span>
                    </td>
                    <td>{(item.averageDailySales ?? 0).toFixed(1)}/day</td>
                    <td>
                      {item.estimatedDaysUntilStockout === null ? (
                        <span className="text-muted">No sales</span>
                      ) : item.estimatedDaysUntilStockout === 0 ? (
                        <span className="danger-text">OUT OF STOCK</span>
                      ) : (
                        <span className="warning-text">~{item.estimatedDaysUntilStockout.toFixed(1)} days</span>
                      )}
                    </td>
                    <td>
                      <span className={getBadgeClass(item.riskLevel)}>{(item.riskLevel ?? 'healthy').toUpperCase()}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

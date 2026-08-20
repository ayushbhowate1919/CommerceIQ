import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchInventoryRisks, fetchInventorySummary } from '../api/dashboardApi';
import type { InventoryRiskItem, InventorySummary } from '../types/dashboard';

export function InventoryPage() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [risks, setRisks] = useState<InventoryRiskItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [lookbackDays, setLookbackDays] = useState<number>(30);
  const [riskLevel, setRiskLevel] = useState<string>('');
  const [reorderOnly, setReorderOnly] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInventorySummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');

    fetchInventoryRisks({
      lookbackDays,
      riskLevel: riskLevel || undefined,
      reorderOnly: reorderOnly || undefined,
      category: category || undefined,
      search: search.trim() || undefined,
      page,
      limit: 20,
    })
      .then((res) => {
        setRisks(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages);
          setTotalItems(res.pagination.total);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load inventory intelligence.');
      })
      .finally(() => setLoading(false));
  }, [lookbackDays, riskLevel, reorderOnly, category, search, page]);

  const getBadgeClass = (level: string) => {
    switch (level) {
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

  const totalStockUnits = summary?.totalStockUnits ?? summary?.totalUnits ?? 0;

  return (
    <div className="inventory-page">
      <div className="page-header flex-header">
        <div>
          <h1 className="page-title">Inventory Risk Intelligence</h1>
          <p className="page-subtitle">Deterministic stockout estimations, risk classification, and reorder warnings</p>
        </div>
        <Link to="/products/new" className="btn btn-primary">
          + Add Product
        </Link>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Products</span>
            <span className="kpi-icon">📦</span>
          </div>
          <div className="kpi-value">{summary?.totalProducts ?? 0}</div>
          <span className="kpi-subtext">Active store SKUs</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Units in Stock</span>
            <span className="kpi-icon">📊</span>
          </div>
          <div className="kpi-value">{new Intl.NumberFormat('en-US').format(totalStockUnits)}</div>
          <span className="kpi-subtext">Physical units</span>
        </div>

        <div className="kpi-card danger-card">
          <div className="kpi-header">
            <span className="kpi-title">Out of Stock</span>
            <span className="kpi-icon">❌</span>
          </div>
          <div className="kpi-value danger">{summary?.outOfStockCount ?? 0}</div>
          <span className="kpi-subtext">Items at 0 stock</span>
        </div>

        <div className="kpi-card warning-card">
          <div className="kpi-header">
            <span className="kpi-title">Critical Risk (0-3 Days)</span>
            <span className="kpi-icon">⚠️</span>
          </div>
          <div className="kpi-value warning">{summary?.criticalRiskCount ?? 0}</div>
          <span className="kpi-subtext">Immediate reorder required</span>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group search-group">
          <input
            className="search-input"
            type="text"
            placeholder="Search by product name or SKU…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="filter-group">
          <select
            className="select-input"
            value={lookbackDays}
            onChange={(e) => {
              setLookbackDays(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={7}>Lookback: 7 Days</option>
            <option value={14}>Lookback: 14 Days</option>
            <option value={30}>Lookback: 30 Days</option>
            <option value={60}>Lookback: 60 Days</option>
            <option value={90}>Lookback: 90 Days</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            className="select-input"
            value={riskLevel}
            onChange={(e) => {
              setRiskLevel(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Risk Levels</option>
            <option value="critical">Critical (0-3 days)</option>
            <option value="high">High (4-7 days)</option>
            <option value="medium">Medium (8-14 days)</option>
            <option value="healthy">Healthy (15+ days)</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            className="select-input"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Apparel">Apparel</option>
            <option value="Accessories">Accessories</option>
            <option value="Home & Kitchen">Home & Kitchen</option>
            <option value="Footwear">Footwear</option>
          </select>
        </div>

        <div className="filter-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={reorderOnly}
              onChange={(e) => {
                setReorderOnly(e.target.checked);
                setPage(1);
              }}
            />
            Reorder Needed Only
          </label>
        </div>
      </div>

      {error && <div className="alert-error" role="alert">{error}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Avg Daily Sales</th>
              <th>Estimated Stockout</th>
              <th>Risk Level</th>
              <th>Suggested Reorder</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                  Calculating inventory risk metrics…
                </td>
              </tr>
            ) : risks.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <h3>No inventory risks match criteria</h3>
                    <p>Try adjusting your search query, lookback window, or filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              risks.map((item) => {
                const id = item.productId ?? item.product?._id ?? '';
                const name = item.name ?? item.product?.name ?? 'Unknown Product';
                const sku = item.sku ?? item.product?.sku ?? '';
                const itemCat = item.category ?? item.product?.category ?? '';
                const stock = item.stock ?? item.product?.stock ?? 0;
                const reorderLevel = item.reorderLevel ?? item.product?.reorderLevel ?? 0;

                return (
                  <tr key={id || sku || name}>
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
                      <code>{sku}</code>
                    </td>
                    <td>{itemCat}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          color: stock <= reorderLevel ? '#b45309' : '#0f172a',
                        }}
                      >
                        {stock}
                      </span>
                    </td>
                    <td>{(item.averageDailySales ?? 0).toFixed(2)} / day</td>
                    <td>
                      {item.estimatedDaysUntilStockout === null ? (
                        <span className="text-muted">No sales</span>
                      ) : item.estimatedDaysUntilStockout === 0 ? (
                        <span className="badge-risk critical">OUT OF STOCK</span>
                      ) : (
                        <span>{item.estimatedDaysUntilStockout.toFixed(1)} days</span>
                      )}
                    </td>
                    <td>
                      <span className={getBadgeClass(item.riskLevel)}>{(item.riskLevel ?? 'healthy').toUpperCase()}</span>
                    </td>
                    <td>
                      {item.reorderNeeded ? (
                        <span className="reorder-badge warning">
                          📦 Reorder +{item.suggestedReorderQuantity} units
                        </span>
                      ) : (
                        <span className="reorder-badge healthy">Sufficient</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination-bar">
            <span className="pagination-info">
              Showing Page {page} of {totalPages} ({totalItems} items)
            </span>
            <div className="pagination-controls">
              <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

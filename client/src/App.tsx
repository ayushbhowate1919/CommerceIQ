import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SidebarLayout } from './components/layout/SidebarLayout';
import { BusinessAdvisorPage } from './pages/BusinessAdvisorPage';
import { DashboardPage } from './pages/DashboardPage';
import { DescriptionGeneratorPage } from './pages/DescriptionGeneratorPage';
import { InventoryPage } from './pages/InventoryPage';
import { ReviewsPage } from './pages/ReviewsPage';

export type User = { id: string; name: string; email: string; role: string; createdAt: string };
export type AuthResponse = { token: string; user: User };

export type Product = {
  _id: string;
  merchant: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  price: number;
  costPrice: number;
  stock: number;
  reorderLevel: number;
  rating: number;
  reviewCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PaginationMetadata = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  authenticate: (path: string, body: object) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

async function request<T>(
  path: string,
  options: RequestInit = {},
  explicitToken?: string
): Promise<{ data: T; pagination?: PaginationMetadata }> {
  const token = explicitToken ?? localStorage.getItem('commerceiq.authToken') ?? undefined;
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const payload = (await response.json()) as {
    success: boolean;
    data?: T;
    pagination?: PaginationMetadata;
    error?: { message: string; code: string };
  };

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? 'Request failed.');
  }

  return {
    data: payload.data as T,
    pagination: payload.pagination,
  };
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('commerceiq.authToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    void request<{ user: User }>('/auth/me', {}, token)
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem('commerceiq.authToken'))
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      async authenticate(path, body) {
        const result = await request<AuthResponse>(path, { method: 'POST', body: JSON.stringify(body) });
        localStorage.setItem('commerceiq.authToken', result.data.token);
        setUser(result.data.user);
      },
      async logout() {
        const token = localStorage.getItem('commerceiq.authToken');
        if (token) {
          try {
            await request('/auth/logout', { method: 'POST' }, token);
          } catch {
            /* Local logout must complete */
          }
        }
        localStorage.removeItem('commerceiq.authToken');
        setUser(null);
      },
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('Auth context is unavailable.');
  return context;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="auth-page">
        <p>Loading workspace…</p>
      </main>
    );
  }

  return user ? (
    <ErrorBoundary fallbackTitle="CommerceIQ Dashboard Error">
      <SidebarLayout user={user} onLogout={logout}>
        {children}
      </SidebarLayout>
    </ErrorBoundary>
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  );
}

function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, authenticate } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register';

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await authenticate(isRegister ? '/auth/register' : '/auth/login', Object.fromEntries(form));
      navigate((location.state as { from?: string } | null)?.from ?? '/dashboard', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to continue.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">CommerceIQ Platform</p>
        <h1>{isRegister ? 'Create your merchant account' : 'Sign in to workspace'}</h1>
        <p>{isRegister ? 'Start with secure access to your commerce workspace.' : 'Access your products, orders, and sales intelligence.'}</p>
        <form onSubmit={submit}>
          {isRegister && (
            <div className="form-group">
              <label htmlFor="name">Store / Owner Name</label>
              <input id="name" name="name" autoComplete="name" placeholder="e.g. Acro Electronics" required />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="merchant@example.com" required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={8}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div className="alert-error" role="alert">{error}</div>}
          <button className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Please wait…' : isRegister ? 'Create Account' : 'Log In'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#64748b' }}>
          {isRegister ? 'Already registered? ' : 'New merchant? '}
          <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create account'}</Link>
        </p>
      </section>
    </main>
  );
}


function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (search.trim()) params.set('search', search.trim());
    if (category) params.set('category', category);
    if (status) params.set('status', status);

    void request<Product[]>(`/products?${params.toString()}`)
      .then((res) => {
        setProducts(res.data);
        if (res.pagination) setPagination(res.pagination);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load products.'))
      .finally(() => setLoading(false));
  }, [page, search, category, status]);

  function getStatusBadgeClass(prodStatus: string, stock: number, reorderLevel: number) {
    if (stock === 0) return 'badge badge-out-of-stock';
    if (stock <= reorderLevel) return 'badge badge-low-stock';
    if (prodStatus === 'active') return 'badge badge-active';
    if (prodStatus === 'draft') return 'badge badge-draft';
    return 'badge badge-archived';
  }

  return (
    <main className="app-page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Product Catalog</h1>
          <p className="page-subtitle">Manage products, pricing, stock levels, and status.</p>
        </div>
        <Link to="/products/new" className="btn btn-primary">
          + Add Product
        </Link>
      </div>

      <div className="filter-bar">
        <div className="filter-group search-group">
          <input
            className="search-input"
            type="text"
            placeholder="Search products by name or SKU…"
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
        <div className="filter-group">
          <select
            className="select-input"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
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
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading products…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <h3>No products found</h3>
                    <p>Try adjusting your search query or filters, or add a new product.</p>
                    <Link to="/products/new" className="btn btn-primary" style={{ marginTop: '0.75rem' }}>
                      + Add First Product
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((prod) => (
                <tr key={prod._id}>
                  <td>
                    <Link to={`/products/${prod._id}`} className="product-name-link">
                      {prod.name}
                    </Link>
                  </td>
                  <td>
                    <code style={{ background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>
                      {prod.sku}
                    </code>
                  </td>
                  <td>{prod.category}</td>
                  <td>${prod.price.toFixed(2)}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: prod.stock <= prod.reorderLevel ? '#b45309' : '#0f172a' }}>
                      {prod.stock}
                    </span>
                    {prod.stock <= prod.reorderLevel && (
                      <span style={{ fontSize: '0.75rem', color: '#b45309', marginLeft: '0.35rem' }}>
                        (Low)
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(prod.status, prod.stock, prod.reorderLevel)}>
                      {prod.stock === 0 ? 'Out of Stock' : prod.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/products/${prod._id}`} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                      Edit / View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {pagination.totalPages > 1 && (
          <div className="pagination-bar">
            <span className="pagination-info">
              Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total items)
            </span>
            <div className="pagination-controls">
              <button className="btn btn-secondary" disabled={pagination.page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <button
                className="btn btn-secondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function ProductCreatePage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const body = {
      name: formData.get('name'),
      sku: formData.get('sku'),
      category: formData.get('category'),
      description: formData.get('description'),
      price: Number(formData.get('price')),
      costPrice: Number(formData.get('costPrice')),
      stock: Number(formData.get('stock')),
      reorderLevel: Number(formData.get('reorderLevel')),
      status: formData.get('status'),
    };

    try {
      const res = await request<Product>('/products', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      navigate(`/products/${res.data._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Create New Product</h1>
          <p className="page-subtitle">Add a product to your store inventory.</p>
        </div>
        <Link to="/products" className="btn btn-secondary">
          Back to Products
        </Link>
      </div>

      {error && <div className="alert-error" role="alert">{error}</div>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Product Name *</label>
              <input id="name" name="name" placeholder="e.g. Wireless Headphones" required />
            </div>

            <div className="form-group">
              <label htmlFor="sku">SKU Code *</label>
              <input id="sku" name="sku" placeholder="e.g. HP-WIRELESS-01" required />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <input id="category" name="category" placeholder="e.g. Electronics" required />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue="active">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="price">Selling Price ($) *</label>
              <input id="price" name="price" type="number" step="0.01" min="0" placeholder="49.99" required />
            </div>

            <div className="form-group">
              <label htmlFor="costPrice">Cost Price ($) *</label>
              <input id="costPrice" name="costPrice" type="number" step="0.01" min="0" placeholder="20.00" required />
            </div>

            <div className="form-group">
              <label htmlFor="stock">Initial Stock *</label>
              <input id="stock" name="stock" type="number" min="0" placeholder="100" required />
            </div>

            <div className="form-group">
              <label htmlFor="reorderLevel">Reorder Threshold *</label>
              <input id="reorderLevel" name="reorderLevel" type="number" min="0" placeholder="15" required />
            </div>

            <div className="form-group full-width">
              <label htmlFor="description">Product Description</label>
              <textarea
                id="description"
                name="description"
                placeholder="Detailed description of features, materials, or specifications…"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving Product…' : 'Create Product'}
            </button>
            <Link to="/products" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    void request<Product>(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load product.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    setError('');
    setSuccess('');
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const updates = {
      name: formData.get('name'),
      sku: formData.get('sku'),
      category: formData.get('category'),
      description: formData.get('description'),
      price: Number(formData.get('price')),
      costPrice: Number(formData.get('costPrice')),
      stock: Number(formData.get('stock')),
      reorderLevel: Number(formData.get('reorderLevel')),
      status: formData.get('status'),
    };

    try {
      const res = await request<Product>(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setProduct(res.data);
      setSuccess('Product details updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setError('');
    setSubmitting(true);
    try {
      await request(`/products/${id}`, { method: 'DELETE' });
      navigate('/products', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="app-page">
        <p>Loading product details…</p>
      </main>
    );
  }

  if (error && !product) {
    return (
      <main className="app-page">
        <div className="alert-error">{error}</div>
        <Link to="/products" className="btn btn-secondary">
          Back to Products
        </Link>
      </main>
    );
  }

  if (!product) return null;

  const profitMargin = product.price > 0 ? (((product.price - product.costPrice) / product.price) * 100).toFixed(1) : '0';

  return (
    <main className="app-page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>{product.name}</h1>
          <p className="page-subtitle">SKU: {product.sku} | Category: {product.category}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/products" className="btn btn-secondary">
            Back to Products
          </Link>
          <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
            Delete Product
          </button>
        </div>
      </div>

      {error && <div className="alert-error" role="alert">{error}</div>}
      {success && <div className="alert-success" role="status">{success}</div>}

      {confirmDelete && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
          <h3 style={{ color: '#991b1b', marginTop: 0 }}>Confirm Product Deletion</h3>
          <p style={{ color: '#7f1d1d' }}>
            Are you sure you want to delete <strong>{product.name}</strong>? This action is permanent and cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-danger" onClick={() => void handleDelete()} disabled={submitting}>
              {submitting ? 'Deleting…' : 'Yes, Delete Permanently'}
            </button>
            <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)} disabled={submitting}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="detail-grid">
        <div className="card detail-item">
          <span className="detail-label">Selling Price</span>
          <span className="detail-value highlight">${product.price.toFixed(2)}</span>
        </div>
        <div className="card detail-item">
          <span className="detail-label">Cost Price</span>
          <span className="detail-value">${product.costPrice.toFixed(2)}</span>
        </div>
        <div className="card detail-item">
          <span className="detail-label">Estimated Margin</span>
          <span className="detail-value" style={{ color: Number(profitMargin) > 0 ? '#166534' : '#991b1b' }}>
            {profitMargin}%
          </span>
        </div>
        <div className="card detail-item">
          <span className="detail-label">Current Stock</span>
          <span className="detail-value" style={{ color: product.stock <= product.reorderLevel ? '#b45309' : '#0f172a' }}>
            {product.stock}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Reorder level: {product.reorderLevel}</span>
        </div>
      </div>

      <div className="card">
        <h3>Edit Product Information</h3>
        <form onSubmit={handleUpdate}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Product Name</label>
              <input id="name" name="name" defaultValue={product.name} required />
            </div>

            <div className="form-group">
              <label htmlFor="sku">SKU Code</label>
              <input id="sku" name="sku" defaultValue={product.sku} required />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <input id="category" name="category" defaultValue={product.category} required />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={product.status}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="price">Selling Price ($)</label>
              <input id="price" name="price" type="number" step="0.01" min="0" defaultValue={product.price} required />
            </div>

            <div className="form-group">
              <label htmlFor="costPrice">Cost Price ($)</label>
              <input id="costPrice" name="costPrice" type="number" step="0.01" min="0" defaultValue={product.costPrice} required />
            </div>

            <div className="form-group">
              <label htmlFor="stock">Current Stock</label>
              <input id="stock" name="stock" type="number" min="0" defaultValue={product.stock} required />
            </div>

            <div className="form-group">
              <label htmlFor="reorderLevel">Reorder Threshold</label>
              <input id="reorderLevel" name="reorderLevel" type="number" min="0" defaultValue={product.reorderLevel} required />
            </div>

            <div className="form-group full-width">
              <label htmlFor="description">Product Description</label>
              <textarea id="description" name="description" defaultValue={product.description} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving Changes…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProductListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/new"
            element={
              <ProtectedRoute>
                <ProductCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id"
            element={
              <ProtectedRoute>
                <ProductDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews"
            element={
              <ProtectedRoute>
                <ReviewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai/business-advisor"
            element={
              <ProtectedRoute>
                <BusinessAdvisorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai/description-generator"
            element={
              <ProtectedRoute>
                <DescriptionGeneratorPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

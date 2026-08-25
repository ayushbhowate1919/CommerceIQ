import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyzeProductReviewsApi, analyzeSingleReviewApi } from '../api/aiApi';
import type { PaginationMetadata } from '../api/client';
import { request } from '../api/client';
import { fetchReviews, fetchReviewSummary } from '../api/reviewApi';
import type { ProductReviewsAnalysis, SingleReviewAnalysis } from '../types/ai';
import type { ReviewItem, ReviewSummary } from '../types/review';

type SimpleProduct = { _id: string; name: string; sku: string };

function renderStars(rating: number) {
  const fullStars = Math.floor(rating);
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      stars.push(<span key={i} style={{ color: '#f59e0b', fontSize: '1.1rem' }}>★</span>);
    } else {
      stars.push(<span key={i} style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>★</span>);
    }
  }
  return stars;
}

export function ReviewsPage() {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [products, setProducts] = useState<SimpleProduct[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Filters
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [productFilter, setProductFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [error, setError] = useState<string>('');

  // AI Product Analysis State
  const [aiProductAnalysis, setAiProductAnalysis] = useState<ProductReviewsAnalysis | null>(null);
  const [loadingAiProduct, setLoadingAiProduct] = useState<boolean>(false);
  const [aiProductError, setAiProductError] = useState<string>('');

  // AI Single Review Loading State Map
  const [analyzingReviewIds, setAnalyzingReviewIds] = useState<Record<string, boolean>>({});

  // Fetch Summary & Product List once
  useEffect(() => {
    setLoadingSummary(true);
    fetchReviewSummary()
      .then((res) => setSummary(res))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load review summary.'))
      .finally(() => setLoadingSummary(false));

    request<SimpleProduct[]>('/products?limit=100')
      .then((res) => setProducts(res.data))
      .catch(() => { /* silent fallback */ });
  }, []);

  // Reset product AI analysis when product filter changes
  useEffect(() => {
    setAiProductAnalysis(null);
    setAiProductError('');
  }, [productFilter]);

  // Fetch Paginated Reviews when filters change
  useEffect(() => {
    setLoadingReviews(true);
    setError('');

    fetchReviews({
      page,
      limit: 20,
      rating: ratingFilter,
      productId: productFilter || undefined,
      search: searchQuery.trim() || undefined,
      verifiedOnly,
    })
      .then((res) => {
        setReviews(res.data);
        if (res.pagination) setPagination(res.pagination);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load reviews.'))
      .finally(() => setLoadingReviews(false));
  }, [page, ratingFilter, productFilter, searchQuery, verifiedOnly]);

  const handleAnalyzeProductReviews = async (forceRefresh = false) => {
    if (!productFilter) return;
    setLoadingAiProduct(true);
    setAiProductError('');
    try {
      const result = await analyzeProductReviewsApi(productFilter, forceRefresh);
      setAiProductAnalysis(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to run product review AI analysis.';
      setAiProductError(msg);
    } finally {
      setLoadingAiProduct(false);
    }
  };

  const handleAnalyzeSingleReview = async (reviewId: string, forceRefresh = false) => {
    setAnalyzingReviewIds((prev) => ({ ...prev, [reviewId]: true }));
    try {
      const analysis: SingleReviewAnalysis = await analyzeSingleReviewApi(reviewId, forceRefresh);
      setReviews((prev) =>
        prev.map((r) => (r._id === reviewId ? { ...r, aiAnalysis: analysis } : r))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to analyze review with AI.');
    } finally {
      setAnalyzingReviewIds((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const positivePercent = summary && summary.totalReviews > 0
    ? Math.round((summary.positiveReviewsCount / summary.totalReviews) * 100)
    : 0;

  const selectedProductObj = products.find((p) => p._id === productFilter);

  return (
    <main className="app-page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Customer Reviews & AI Rating Intelligence</h1>
          <p className="page-subtitle">Track merchant rating health, product sentiment, customer feedback, and AI review analysis.</p>
        </div>
      </div>

      {error && <div className="alert-error" role="alert" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {/* KPI Cards & Rating Distribution */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card kpi-card">
          <span className="kpi-title">Average Rating</span>
          <div className="kpi-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{loadingSummary ? '…' : summary?.averageRating.toFixed(1) ?? '0.0'}</span>
            <div style={{ fontSize: '1rem', display: 'inline-flex' }}>
              {renderStars(summary?.averageRating ?? 0)}
            </div>
          </div>
          <span className="kpi-change positive">Storewide Satisfaction</span>
        </div>

        <div className="card kpi-card">
          <span className="kpi-title">Total Customer Reviews</span>
          <div className="kpi-value">{loadingSummary ? '…' : summary?.totalReviews.toLocaleString() ?? '0'}</div>
          <span className="kpi-change positive">
            {positivePercent}% Positive Feedback
          </span>
        </div>

        <div className="card kpi-card" style={{ borderColor: summary && summary.negativeReviewsCount > 0 ? '#fca5a5' : undefined }}>
          <span className="kpi-title">Critical Reviews (1–2 Stars)</span>
          <div className="kpi-value" style={{ color: summary && summary.negativeReviewsCount > 0 ? '#b91c1c' : '#0f172a' }}>
            {loadingSummary ? '…' : summary?.negativeReviewsCount ?? 0}
          </div>
          <span className="kpi-change negative" style={{ color: summary && summary.negativeReviewsCount > 0 ? '#b91c1c' : '#64748b' }}>
            Requires Merchant Attention
          </span>
        </div>
      </div>

      {/* Star Distribution & Lowest Rated Products Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Star Rating Breakdown */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Rating Distribution</h3>
          {loadingSummary ? (
            <p>Loading star breakdown…</p>
          ) : !summary || summary.totalReviews === 0 ? (
            <p>No ratings recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {summary.starDistribution.map((item) => (
                <div
                  key={item.rating}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}
                  onClick={() => {
                    setRatingFilter(item.rating === ratingFilter ? undefined : item.rating);
                    setPage(1);
                  }}
                  title={`Filter by ${item.rating} Stars`}
                >
                  <span style={{ width: '45px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer' }}>
                    {item.rating} ★
                  </span>
                  <div style={{ flex: 1, height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${item.percentage}%`,
                        height: '100%',
                        backgroundColor: item.rating >= 4 ? '#22c55e' : item.rating === 3 ? '#eab308' : '#ef4444',
                        borderRadius: '5px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <span style={{ width: '70px', textAlign: 'right', color: '#64748b', fontSize: '0.85rem' }}>
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lowest Rated Products Alert Card */}
        <div className="card">
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>Products Needing Attention</h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>Lowest average rating across store catalog.</p>
          {loadingSummary ? (
            <p>Loading product feedback…</p>
          ) : !summary || summary.lowestRatedProducts.length === 0 ? (
            <p style={{ color: '#166534' }}>All products maintain healthy rating scores.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {summary.lowestRatedProducts.map((prod) => (
                <div
                  key={prod.productId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.8rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <Link
                      to={`/products/${prod.productId}`}
                      style={{ fontWeight: 600, color: '#0f172a', textDecoration: 'none' }}
                    >
                      {prod.name}
                    </Link>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      SKU: {prod.sku} • {prod.reviewCount} review{prod.reviewCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: prod.averageRating <= 3 ? '#fef2f2' : '#fefce8',
                        color: prod.averageRating <= 3 ? '#991b1b' : '#854d0e',
                        borderColor: prod.averageRating <= 3 ? '#fca5a5' : '#fef08a',
                        fontWeight: 700,
                      }}
                    >
                      {prod.averageRating.toFixed(1)} ★
                    </span>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      onClick={() => {
                        setProductFilter(prod.productId);
                        setPage(1);
                      }}
                    >
                      Filter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Product Review Intelligence Section */}
      <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #6366f1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>✨ Gemini AI Review Intelligence</span>
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              {selectedProductObj
                ? `Analyze customer review themes, sentiment, and actionable insights for ${selectedProductObj.name}.`
                : 'Select a product from the filter below to run product-level review batch AI analysis.'}
            </p>
          </div>

          {productFilter && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => handleAnalyzeProductReviews(false)}
                disabled={loadingAiProduct}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {loadingAiProduct ? 'Analyzing Feedback...' : '⚡ Run AI Review Analysis'}
              </button>
              {aiProductAnalysis && (
                <button
                  className="btn btn-secondary"
                  onClick={() => handleAnalyzeProductReviews(true)}
                  disabled={loadingAiProduct}
                  title="Force refresh without using cached summary"
                >
                  🔄 Refresh
                </button>
              )}
            </div>
          )}
        </div>

        {aiProductError && (
          <div className="alert-error" style={{ fontSize: '0.875rem', marginTop: '0.75rem' }}>
            {aiProductError}
          </div>
        )}

        {aiProductAnalysis && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            {/* Header badges */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Overall Sentiment</span>
                <span
                  className="badge"
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    backgroundColor:
                      aiProductAnalysis.overallSentiment === 'positive'
                        ? '#dcfce7'
                        : aiProductAnalysis.overallSentiment === 'mixed'
                        ? '#fef9c3'
                        : '#fee2e2',
                    color:
                      aiProductAnalysis.overallSentiment === 'positive'
                        ? '#15803d'
                        : aiProductAnalysis.overallSentiment === 'mixed'
                        ? '#a16207'
                        : '#b91c1c',
                    textTransform: 'capitalize',
                  }}
                >
                  {aiProductAnalysis.overallSentiment} Sentiment
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Sentiment Score</span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>
                  {(aiProductAnalysis.sentimentScore * 100).toFixed(0)}/100
                </span>
              </div>

              {aiProductAnalysis.analyzedReviewCount !== undefined && (
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Analyzed Reviews</span>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#334155' }}>
                    {aiProductAnalysis.analyzedReviewCount} Reviews in Batch
                  </span>
                </div>
              )}
            </div>

            {/* Executive Summary */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <strong style={{ fontSize: '0.9rem', color: '#334155' }}>Executive Synthesis:</strong>
              <p style={{ margin: '0.35rem 0 0 0', color: '#1e293b', lineHeight: 1.5, fontSize: '0.925rem' }}>
                {aiProductAnalysis.summary}
              </p>
            </div>

            {/* Positive & Negative Themes Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', padding: '0.85rem', borderRadius: '0.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#166534', fontSize: '0.9rem' }}>👍 Top Positive Themes</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {aiProductAnalysis.topPositiveThemes.map((theme, i) => (
                    <span key={i} className="badge" style={{ backgroundColor: '#dcfce7', color: '#14532d', borderColor: '#86efac' }}>
                      {theme}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ border: '1px solid #fecaca', backgroundColor: '#fef2f2', padding: '0.85rem', borderRadius: '0.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontSize: '0.9rem' }}>👎 Pain Points & Complaints</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {aiProductAnalysis.topNegativeThemes.map((theme, i) => (
                    <span key={i} className="badge" style={{ backgroundColor: '#fee2e2', color: '#7f1d1d', borderColor: '#fca5a5' }}>
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Actions */}
            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.85rem', borderRadius: '0.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af', fontSize: '0.9rem' }}>💡 Recommended Merchant Actions</h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#1e3a8a', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {aiProductAnalysis.recommendedActions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: '1.5rem' }}>
        <div className="filter-group search-group" style={{ minWidth: '240px' }}>
          <input
            className="search-input"
            type="text"
            placeholder="Search review content..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="filter-group">
          <select
            className="select-input"
            value={ratingFilter ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setRatingFilter(val ? Number(val) : undefined);
              setPage(1);
            }}
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars (Excellent)</option>
            <option value="4">4 Stars (Good)</option>
            <option value="3">3 Stars (Average)</option>
            <option value="2">2 Stars (Poor)</option>
            <option value="1">1 Star (Critical)</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            className="select-input"
            value={productFilter}
            onChange={(e) => {
              setProductFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => {
                setVerifiedOnly(e.target.checked);
                setPage(1);
              }}
            />
            Verified Buyers Only
          </label>
        </div>

        {(ratingFilter !== undefined || productFilter) && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setRatingFilter(undefined);
              setProductFilter('');
              setPage(1);
            }}
            style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Reviews Table / Card List */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Customer Reviews Feed</h3>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Showing {reviews.length} of {pagination.total} reviews
          </span>
        </div>

        {loadingReviews ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p>Loading customer reviews…</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>No reviews found</h3>
            <p style={{ color: '#64748b' }}>Try adjusting your search criteria, product selection, or star filter.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((rev) => (
              <div
                key={rev._id}
                style={{
                  padding: '1.25rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  backgroundColor: rev.rating <= 2 ? '#fff5f5' : '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: rev.rating <= 2 ? '#fee2e2' : '#e0f2fe',
                        color: rev.rating <= 2 ? '#b91c1c' : '#0369a1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                      }}
                    >
                      {rev.customerId?.name ? rev.customerId.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {rev.customerId?.name || 'Verified Customer'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(rev.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ display: 'inline-flex' }}>{renderStars(rev.rating)}</div>
                    {rev.verifiedPurchase && (
                      <span className="badge badge-active" style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem' }}>
                        ✓ Verified Purchase
                      </span>
                    )}

                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                      onClick={() => handleAnalyzeSingleReview(rev._id, !!rev.aiAnalysis)}
                      disabled={analyzingReviewIds[rev._id]}
                    >
                      {analyzingReviewIds[rev._id]
                        ? 'Analyzing…'
                        : rev.aiAnalysis
                        ? '✨ Re-analyze AI'
                        : '✨ AI Sentiment'}
                    </button>
                  </div>
                </div>

                {/* Product link tag */}
                {rev.productId && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>Product: </span>
                    <Link to={`/products/${rev.productId._id}`} style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
                      {rev.productId.name}
                    </Link>
                    <code style={{ marginLeft: '0.4rem', background: '#f1f5f9', padding: '0.1rem 0.3rem', borderRadius: '0.2rem', fontSize: '0.75rem' }}>
                      {rev.productId.sku}
                    </code>
                  </div>
                )}

                {/* Review Text */}
                <div style={{ marginTop: '0.75rem', color: '#334155', lineHeight: 1.5, fontSize: '0.95rem' }}>
                  "{rev.text}"
                </div>

                {/* Single Review AI Analysis Card if present */}
                {rev.aiAnalysis && (
                  <div
                    style={{
                      marginTop: '0.85rem',
                      padding: '0.75rem 1rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.4rem',
                      borderLeft: `3px solid ${
                        rev.aiAnalysis.sentiment === 'positive'
                          ? '#22c55e'
                          : rev.aiAnalysis.sentiment === 'negative'
                          ? '#ef4444'
                          : '#eab308'
                      }`,
                      fontSize: '0.875rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>✨ AI Sentiment Analysis:</span>
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.75rem',
                            textTransform: 'capitalize',
                            backgroundColor:
                              rev.aiAnalysis.sentiment === 'positive'
                                ? '#dcfce7'
                                : rev.aiAnalysis.sentiment === 'negative'
                                ? '#fee2e2'
                                : '#fef9c3',
                            color:
                              rev.aiAnalysis.sentiment === 'positive'
                                ? '#15803d'
                                : rev.aiAnalysis.sentiment === 'negative'
                                ? '#b91c1c'
                                : '#a16207',
                          }}
                        >
                          {rev.aiAnalysis.sentiment}
                        </span>
                      </span>

                      {rev.aiAnalysis.analyzedAt && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Analyzed {new Date(rev.aiAnalysis.analyzedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <p style={{ margin: '0 0 0.4rem 0', color: '#475569', fontStyle: 'italic' }}>
                      "{rev.aiAnalysis.summary}"
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.4rem' }}>
                      {rev.aiAnalysis.topics.map((t, idx) => (
                        <span key={idx} className="badge" style={{ backgroundColor: '#e2e8f0', color: '#334155', fontSize: '0.75rem' }}>
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div style={{ color: '#1e40af', fontSize: '0.825rem', fontWeight: 600 }}>
                      💡 Suggested Action: {rev.aiAnalysis.suggestedAction}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="pagination-bar" style={{ marginTop: '1.5rem' }}>
            <span className="pagination-info">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total reviews)
            </span>
            <div className="pagination-controls">
              <button
                className="btn btn-secondary"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
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

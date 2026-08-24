import { useEffect, useState } from 'react';
import { generateProductDescriptionApi } from '../api/aiApi';
import { request } from '../api/client';
import type { GeneratedDescriptionResult } from '../types/ai';

type ProductOption = {
  _id: string;
  name: string;
  category?: string;
  description?: string;
};

export function DescriptionGeneratorPage() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Form State
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [features, setFeatures] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [tone, setTone] = useState<string>('Professional');
  const [keywords, setKeywords] = useState<string>('');

  // Status State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<GeneratedDescriptionResult | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    request<ProductOption[]>('/products?limit=100')
      .then((res) => setProducts(res.data))
      .catch(() => {});
  }, []);

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    if (!productId) return;

    const prod = products.find((p) => p._id === productId);
    if (prod) {
      setName(prod.name);
      setCategory(prod.category ?? '');
      if (prod.description) {
        setFeatures(prod.description);
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product Name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const generated = await generateProductDescriptionApi({
        name: name.trim(),
        category: category.trim() || undefined,
        features: features.trim() || undefined,
        targetAudience: targetAudience.trim() || undefined,
        tone: tone || 'Professional',
        keywords: keywords.trim() || undefined,
      });

      setResult(generated);
      showToast('Product description generated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate product description.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  const copyFullPayload = () => {
    if (!result) return;
    const fullText = `TITLE:
${result.title}

SHORT DESCRIPTION:
${result.shortDescription}

LONG DESCRIPTION:
${result.longDescription}

BULLET POINTS:
${result.bulletPoints.map((bp) => `• ${bp}`).join('\n')}

SEO KEYWORDS:
${result.seoKeywords.join(', ')}`;

    copyToClipboard(fullText, 'Complete description bundle');
  };

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            backgroundColor: '#10b981',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            zIndex: 1000,
            fontWeight: 500,
          }}
        >
          ✓ {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>✨</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            AI Product Description Studio
          </h1>
        </div>
        <p style={{ color: '#64748b', margin: 0 }}>
          Generate structured, high-converting product marketing copy and SEO keywords using Gemini AI.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Form Column */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            padding: '1.75rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginTop: 0, marginBottom: '1.25rem' }}>
            Product Inputs
          </h2>

          {/* Auto-fill Selector */}
          {products.length > 0 && (
            <div style={{ marginBottom: '1.25rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Auto-fill from Store Inventory (Optional)
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.875rem',
                }}
              >
                <option value="">-- Choose a product to auto-fill --</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.category ? `(${p.category})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleGenerate}>
            {/* Name */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Product Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. UltraBass Wireless Headphones"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Category */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Electronics, Audio"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Key Features */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Key Features / Highlights
              </label>
              <textarea
                placeholder="e.g. 40hr battery life, Active Noise Cancellation, Bluetooth 5.3, Memory foam earcups"
                rows={3}
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {/* Target Audience */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Target Audience
                </label>
                <input
                  type="text"
                  placeholder="e.g. Remote workers, Gamers"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Tone */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Brand Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="Professional">Professional</option>
                  <option value="Persuasive">Persuasive</option>
                  <option value="Enthusiastic">Enthusiastic</option>
                  <option value="Casual">Casual</option>
                  <option value="Luxury">Luxury</option>
                  <option value="Minimalist">Minimalist</option>
                </select>
              </div>
            </div>

            {/* Keywords */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Focus SEO Keywords
              </label>
              <input
                type="text"
                placeholder="e.g. bluetooth headphones, noise cancelling, travel audio"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                }}
              >
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: loading ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.75rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Generating Copy...
                </>
              ) : (
                <>✨ Generate AI Product Copy</>
              )}
            </button>
          </form>
        </div>

        {/* Results Column */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            padding: '1.75rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
              Generated Copy Output
            </h2>
            {result && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={copyFullPayload}
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#334155',
                  }}
                >
                  📋 Copy All
                </button>
              </div>
            )}
          </div>

          {!result && !loading && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 1.5rem',
                border: '2px dashed #e2e8f0',
                borderRadius: '0.5rem',
                backgroundColor: '#f8fafc',
                color: '#64748b',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤖</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', margin: '0 0 0.5rem 0' }}>
                Ready to generate marketing copy
              </h3>
              <p style={{ fontSize: '0.875rem', margin: 0, maxWidth: '320px' }}>
                Fill out the product parameters on the left and click &quot;Generate AI Product Copy&quot;.
              </p>
            </div>
          )}

          {loading && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem',
                color: '#2563eb',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #dbeafe',
                  borderTopColor: '#2563eb',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '1rem',
                }}
              />
              <p style={{ fontWeight: 600, color: '#1e293b' }}>Crafting structured copy with Gemini...</p>
            </div>
          )}

          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', maxHeight: '700px', paddingRight: '0.25rem' }}>
              {/* Title */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                    Generated Title
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.title, 'Title')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#2563eb' }}
                  >
                    Copy
                  </button>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{result.title}</div>
              </div>

              {/* Short Hook */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                    Short Description / Hook
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.shortDescription, 'Short description')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#2563eb' }}
                  >
                    Copy
                  </button>
                </div>
                <div style={{ fontSize: '0.925rem', color: '#334155', lineHeight: '1.5' }}>{result.shortDescription}</div>
              </div>

              {/* Long Description */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                    Detailed Long Description
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.longDescription, 'Long description')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#2563eb' }}
                  >
                    Copy
                  </button>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                  {result.longDescription}
                </div>
              </div>

              {/* Bullet Points */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                    Key Bullet Points
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.bulletPoints.map((b) => `• ${b}`).join('\n'), 'Bullet points')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#2563eb' }}
                  >
                    Copy
                  </button>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#334155' }}>
                  {result.bulletPoints.map((bp, idx) => (
                    <li key={idx} style={{ marginBottom: '0.375rem' }}>
                      {bp}
                    </li>
                  ))}
                </ul>
              </div>

              {/* SEO Keywords */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                    SEO Keywords & Tags
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.seoKeywords.join(', '), 'SEO Keywords')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#2563eb' }}
                  >
                    Copy
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {result.seoKeywords.map((kw, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

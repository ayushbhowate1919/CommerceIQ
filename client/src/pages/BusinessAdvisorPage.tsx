import { useEffect, useState } from 'react';
import { generateBusinessAdvisorApi, getLatestBusinessAdvisorApi } from '../api/aiApi';
import type { BusinessAdvisorResult } from '../types/ai';

export function BusinessAdvisorPage() {
  const [advisorData, setAdvisorData] = useState<BusinessAdvisorResult | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Load latest cached report on mount
  useEffect(() => {
    setLoading(true);
    getLatestBusinessAdvisorApi()
      .then((res) => {
        if (res) {
          setAdvisorData(res);
          if (res.timeRange === '7d' || res.timeRange === '30d' || res.timeRange === '90d') {
            setTimeRange(res.timeRange);
          }
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to fetch latest business advisor report.'))
      .finally(() => setLoading(false));
  }, []);

  const handleRunAnalysis = async (forceRefresh = false) => {
    setAnalyzing(true);
    setError('');
    try {
      const result = await generateBusinessAdvisorApi(timeRange, forceRefresh);
      setAdvisorData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI Business Advisor analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  const healthScore = advisorData?.healthScore ?? 0;
  const healthBadgeColor =
    healthScore >= 75
      ? { bg: '#dcfce7', text: '#15803d', border: '#86efac' }
      : healthScore >= 50
      ? { bg: '#fef9c3', text: '#a16207', border: '#fde047' }
      : { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };

  return (
    <main className="app-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="page-title-group">
          <h1>⚡ AI Business Advisor Studio</h1>
          <p className="page-subtitle">
            Executive-level growth insights, revenue drivers, stockout warnings, and strategic action plans generated from store metrics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            className="select-input"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            style={{ width: '130px' }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          <button
            className="btn btn-primary"
            onClick={() => handleRunAnalysis(false)}
            disabled={analyzing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
          >
            {analyzing ? 'Analyzing Business Metrics…' : '⚡ Analyze My Business'}
          </button>

          {advisorData && (
            <button
              className="btn btn-secondary"
              onClick={() => handleRunAnalysis(true)}
              disabled={analyzing}
              title="Force fresh Gemini re-analysis"
            >
              🔄 Refresh
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert-error" role="alert" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {loading ? (
        <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <p>Loading AI Business Advisor workspace…</p>
        </div>
      ) : !advisorData ? (
        <div className="card empty-state" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>No Business Snapshot Generated Yet</h2>
          <p style={{ color: '#64748b', maxWidth: '550px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
            Click <strong>"Analyze My Business"</strong> above to calculate deterministic revenue trends, inventory risks, and customer review scores, and receive an AI-generated executive strategy report.
          </p>
          <button className="btn btn-primary" onClick={() => handleRunAnalysis(false)} disabled={analyzing}>
            {analyzing ? 'Analyzing Store Performance…' : '🚀 Generate Initial Business Report'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Business Health Score & Executive Summary Header Card */}
          <div className="card" style={{ borderLeft: `6px solid ${healthBadgeColor.text}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Executive Summary</h2>
                  {advisorData.timeRange && (
                    <span className="badge badge-active" style={{ fontSize: '0.8rem' }}>
                      Period: {advisorData.timeRange}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, color: '#334155', lineHeight: 1.6, fontSize: '1.025rem' }}>
                  {advisorData.executiveSummary}
                </p>
              </div>

              {/* Health Score Gauge Box */}
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderRadius: '0.75rem',
                  backgroundColor: healthBadgeColor.bg,
                  border: `1px solid ${healthBadgeColor.border}`,
                  textAlign: 'center',
                  minWidth: '160px',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: healthBadgeColor.text, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Store Health Score
                </span>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: healthBadgeColor.text, lineHeight: 1.1, margin: '0.25rem 0' }}>
                  {advisorData.healthScore}
                  <span style={{ fontSize: '1.2rem', fontWeight: 500, color: '#64748b' }}>/100</span>
                </div>
                <span style={{ fontSize: '0.825rem', color: healthBadgeColor.text, fontWeight: 600 }}>
                  {advisorData.healthScore >= 75
                    ? 'Excellent Performance'
                    : advisorData.healthScore >= 50
                    ? 'Moderate Performance'
                    : 'Critical Action Required'}
                </span>
              </div>
            </div>

            {advisorData.analyzedAt && (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                Report generated on {new Date(advisorData.analyzedAt).toLocaleString()}
              </div>
            )}
          </div>

          {/* Core Business Strengths & Operational Risks Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {/* Strengths Card */}
            <div className="card" style={{ borderTop: '4px solid #22c55e' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>💪 Key Business Strengths & Drivers</span>
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {advisorData.strengths.map((item, idx) => (
                  <li key={idx} style={{ color: '#1e293b', lineHeight: 1.5, fontSize: '0.925rem' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Risks Card */}
            <div className="card" style={{ borderTop: '4px solid #ef4444' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚠️ Operational & Stockout Risks</span>
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {advisorData.risks.map((item, idx) => (
                  <li key={idx} style={{ color: '#1e293b', lineHeight: 1.5, fontSize: '0.925rem' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommended Action Plan Matrix */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🎯 Strategic Action Plan</span>
              </h3>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Prioritized recommendations based on inventory, sales, and reviews data
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {advisorData.recommendedActions.map((actionItem, index) => {
                const priorityBadge =
                  actionItem.priority === 'high'
                    ? { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', label: 'HIGH PRIORITY' }
                    : actionItem.priority === 'medium'
                    ? { bg: '#fef9c3', text: '#a16207', border: '#fde047', label: 'MEDIUM' }
                    : { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', label: 'LOW' };

                return (
                  <div
                    key={index}
                    style={{
                      padding: '1.1rem 1.25rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #e2e8f0',
                      backgroundColor: actionItem.priority === 'high' ? '#fffafb' : '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: priorityBadge.bg,
                            color: priorityBadge.text,
                            borderColor: priorityBadge.border,
                            fontWeight: 800,
                            fontSize: '0.75rem',
                          }}
                        >
                          {priorityBadge.label}
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            textTransform: 'uppercase',
                            fontSize: '0.75rem',
                          }}
                        >
                          {actionItem.category.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '1rem', marginBottom: '0.35rem' }}>
                      {actionItem.action}
                    </div>

                    <div style={{ color: '#047857', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>🚀 Impact:</span> {actionItem.impact}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

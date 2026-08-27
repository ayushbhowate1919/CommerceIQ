import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkAiHealth, processAnalyticsQueryApi } from '../api/aiApi';
import type { ToolExecutionLog } from '../types/ai';

type Message = {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolsUsed?: ToolExecutionLog[];
  aiConfigured?: boolean;
  timestamp: string;
};

const EXAMPLE_QUESTIONS = [
  {
    icon: '🏷️',
    title: 'Category Breakdown',
    query: 'Which category generated the most revenue last month?',
    toolHint: 'get_revenue_by_category',
  },
  {
    icon: '⚠️',
    title: 'Inventory Stockout Risks',
    query: 'Which products are at risk of running out of stock?',
    toolHint: 'get_inventory_risk',
  },
  {
    icon: '📈',
    title: '30-Day Sales Trend',
    query: 'How did our sales trend over the last 30 days?',
    toolHint: 'get_sales_trend',
  },
  {
    icon: '🏆',
    title: 'Top Performing Products',
    query: 'What were our top 5 products by revenue?',
    toolHint: 'get_top_products',
  },
  {
    icon: '📦',
    title: 'Order Status & Net Revenue',
    query: 'What is our order cancellation rate and total net revenue?',
    toolHint: 'get_order_summary',
  },
  {
    icon: '⚖️',
    title: 'Period-over-Period Growth',
    query: 'How does our performance this period compare to the previous period?',
    toolHint: 'get_period_comparison',
  },
];

export function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Hello! I am your AI Commerce Analyst powered by Gemini and connected directly to your store database. Ask me any question about your revenue, sales trends, top products, category breakdown, inventory risks, or order history.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('Analyzing sales data...');
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [expandedToolsMsgId, setExpandedToolsMsgId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAiHealth()
      .then((res) => setAiConfigured(res.configured))
      .catch(() => setAiConfigured(false));
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleAsk = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || loading) return;

    setError('');
    const userMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);
    setLoadingStage('Analyzing query and dispatching analytics tools...');

    const stageTimer = setTimeout(() => {
      setLoadingStage('Executing database aggregations and formatting insights...');
    }, 1200);

    try {
      const response = await processAnalyticsQueryApi(trimmed);
      clearTimeout(stageTimer);

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        toolsUsed: response.toolsUsed,
        aiConfigured: response.aiConfigured,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      clearTimeout(stageTimer);
      setError(err instanceof Error ? err.message : 'Failed to process analytics query.');
    } finally {
      setLoading(false);
    }
  };

  const toggleToolsExpand = (msgId: string) => {
    setExpandedToolsMsgId((prev) => (prev === msgId ? null : msgId));
  };

  const renderContextualLinks = (tools?: ToolExecutionLog[]) => {
    if (!tools || tools.length === 0) {
      return (
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to="/dashboard" className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}>
            📊 View Dashboard
          </Link>
        </div>
      );
    }

    const toolNames = new Set(tools.map((t) => t.toolName));
    const links: Array<{ label: string; to: string; icon: string }> = [];

    if (toolNames.has('get_inventory_risk')) {
      links.push({ label: 'View Inventory Health', to: '/inventory', icon: '⚠️' });
    }
    if (toolNames.has('get_top_products') || toolNames.has('get_product_performance')) {
      links.push({ label: 'View Product Catalog', to: '/products', icon: '📦' });
    }
    if (toolNames.has('get_revenue_summary') || toolNames.has('get_sales_trend') || toolNames.has('get_period_comparison')) {
      links.push({ label: 'View Analytics Dashboard', to: '/dashboard', icon: '📊' });
    }

    if (links.length === 0) {
      links.push({ label: 'View Analytics Dashboard', to: '/dashboard', icon: '📊' });
    }

    return (
      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Related Views:</span>
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="btn btn-outline"
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <main className="app-page">
      <div className="page-header">
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1>AI Commerce Analyst</h1>
            <span
              className="badge-pro"
              style={{
                background: aiConfigured ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: aiConfigured ? '#059669' : '#d97706',
                borderColor: aiConfigured ? 'rgba(5, 150, 105, 0.3)' : 'rgba(217, 119, 6, 0.3)',
              }}
            >
              {aiConfigured === true
                ? '⚡ Gemini 3.6 Flash Active | 8 Tools Mounted'
                : aiConfigured === false
                ? '⚠️ Offline Degraded Mode'
                : 'Connecting AI service…'}
            </span>
          </div>
          <p className="page-subtitle">
            Ask questions in plain English to query real-time sales revenue, inventory stockout risks, product performance, and order status.
          </p>
        </div>
      </div>

      {aiConfigured === false && (
        <div className="card" style={{ marginBottom: '1.25rem', borderColor: '#fcd34d', backgroundColor: '#fffbeb' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <strong style={{ color: '#b45309' }}>Gemini API key is unconfigured</strong>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#92400e' }}>
                AI natural-language assistant is operating in fallback offline mode. Set <code>GEMINI_API_KEY</code> in server <code>.env</code> to enable live Gemini multi-turn tool execution.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert-error" role="alert">{error}</div>}

      {/* Suggested Example Prompts Grid */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '0.75rem' }}>
          Suggested Commerce Queries
        </h3>
        <div className="query-suggest-grid">
          {EXAMPLE_QUESTIONS.map((item) => (
            <button
              key={item.title}
              type="button"
              className="query-suggest-card"
              onClick={() => void handleAsk(item.query)}
              disabled={loading}
            >
              <div className="query-suggest-header">
                <span className="query-suggest-icon">{item.icon}</span>
                <span className="query-suggest-title">{item.title}</span>
              </div>
              <p className="query-suggest-text">"{item.query}"</p>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Thread Panel */}
      <div
        className="card"
        style={{
          minHeight: '420px',
          maxHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.25rem',
          background: '#ffffff',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div
          style={{
            overflowY: 'auto',
            paddingRight: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            marginBottom: '1rem',
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.3rem',
                  fontSize: '0.75rem',
                  color: '#64748b',
                }}
              >
                {msg.sender === 'assistant' ? (
                  <>
                    <span style={{ background: '#4f46e5', color: 'white', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', fontWeight: 700 }}>
                      AI Analyst
                    </span>
                    <span>{msg.timestamp}</span>
                  </>
                ) : (
                  <>
                    <span>You</span>
                    <span>{msg.timestamp}</span>
                  </>
                )}
              </div>

              <div
                style={{
                  maxWidth: '85%',
                  padding: '0.9rem 1.1rem',
                  borderRadius: msg.sender === 'user' ? '1rem 1rem 0.2rem 1rem' : '1rem 1rem 1rem 0.2rem',
                  background: msg.sender === 'user' ? '#4f46e5' : '#f8fafc',
                  color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                  border: msg.sender === 'assistant' ? '1px solid #e2e8f0' : 'none',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.text}

                {/* Executed Tools Badge Accordion */}
                {msg.sender === 'assistant' && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      onClick={() => toggleToolsExpand(msg.id)}
                      style={{
                        background: '#e0e7ff',
                        color: '#3730a3',
                        border: '1px solid #c7d2fe',
                        borderRadius: '0.375rem',
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <span>🛠️ Tools Executed ({msg.toolsUsed.length})</span>
                      <span>{expandedToolsMsgId === msg.id ? '▲ Hide' : '▼ View Details'}</span>
                    </button>

                    {expandedToolsMsgId === msg.id && (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          background: '#0f172a',
                          color: '#f8fafc',
                          padding: '0.75rem',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          overflowX: 'auto',
                        }}
                      >
                        {msg.toolsUsed.map((tool, idx) => (
                          <div key={idx} style={{ marginBottom: idx === msg.toolsUsed!.length - 1 ? 0 : '0.6rem' }}>
                            <div style={{ color: '#818cf8', fontWeight: 'bold' }}>
                              ⚡ {tool.toolName}
                            </div>
                            <div style={{ color: '#94a3b8', margin: '0.2rem 0' }}>
                              Params: {JSON.stringify(tool.args)}
                            </div>
                            <div style={{ color: '#cbd5e1', maxHeight: '100px', overflowY: 'auto' }}>
                              Output: {JSON.stringify(tool.output)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {msg.sender === 'assistant' && renderContextualLinks(msg.toolsUsed)}
              </div>
            </div>
          ))}

          {/* Loading Indicator with Stage Messaging */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.3rem' }}>
                <span style={{ background: '#4f46e5', color: 'white', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', fontWeight: 700 }}>
                  AI Analyst
                </span>
              </div>
              <div
                style={{
                  padding: '0.8rem 1.1rem',
                  borderRadius: '1rem 1rem 1rem 0.2rem',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                <span className="spinner" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>{loadingStage}</span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleAsk(inputQuery);
          }}
          style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}
        >
          <input
            type="text"
            className="search-input"
            placeholder="Ask about store revenue, top products, stockout risks, or period trends…"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={loading}
            style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '0.9rem' }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !inputQuery.trim()} style={{ padding: '0.75rem 1.25rem' }}>
            {loading ? 'Analyzing…' : 'Ask Analyst ⚡'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

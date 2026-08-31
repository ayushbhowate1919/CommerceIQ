import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { checkAiHealth } from '../../api/aiApi';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type SidebarLayoutProps = {
  user: User;
  onLogout: () => Promise<void>;
  children: ReactNode;
};

export function SidebarLayout({ user, onLogout, children }: SidebarLayoutProps) {
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<'checking' | 'configured' | 'unconfigured'>('checking');

  useEffect(() => {
    let mounted = true;
    checkAiHealth()
      .then((health) => {
        if (mounted) {
          setAiStatus(health.configured ? 'configured' : 'unconfigured');
        }
      })
      .catch(() => {
        if (mounted) {
          setAiStatus('unconfigured');
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    await onLogout();
    navigate('/login');
  }

  function closeMobileNav() {
    setIsMobileOpen(false);
  }

  return (
    <div className="layout-wrapper">
      {/* Mobile backdrop overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeMobileNav}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <Link to="/dashboard" className="brand-logo" onClick={closeMobileNav}>
            <span className="brand-icon">⚡</span>
            <span className="brand-title">CommerceIQ</span>
          </Link>
          <div className="brand-right">
            <span className="badge-pro">PRO</span>
            <button
              className="mobile-close-btn"
              onClick={closeMobileNav}
              aria-label="Close navigation menu"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="sidebar-store-info">
          <div className="store-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div className="store-meta">
            <div className="store-name">{user.name}</div>
            <div className="store-role">{user.role} workspace</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Overview</div>
          <NavLink
            to="/dashboard"
            onClick={closeMobileNav}
            className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
          >
            <span className="link-icon">📊</span>
            <span>Dashboard</span>
          </NavLink>

          <div className="nav-section-title">Catalog & Inventory</div>
          <NavLink
            to="/products"
            onClick={closeMobileNav}
            className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
          >
            <span className="link-icon">📦</span>
            <span>Products</span>
          </NavLink>
          <NavLink
            to="/inventory"
            onClick={closeMobileNav}
            className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
          >
            <span className="link-icon">⚠️</span>
            <span>Inventory Health</span>
          </NavLink>

          <div className="nav-section-title">Customer Feedback</div>
          <NavLink
            to="/reviews"
            onClick={closeMobileNav}
            className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
          >
            <span className="link-icon">⭐</span>
            <span>Customer Reviews</span>
          </NavLink>

          <div className="nav-section-title">AI Studio</div>
          <NavLink
            to="/ai/assistant"
            onClick={closeMobileNav}
            className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
          >
            <span className="link-icon">💬</span>
            <span>AI Commerce Analyst</span>
          </NavLink>
          <NavLink
            to="/ai/business-advisor"
            onClick={closeMobileNav}
            className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
          >
            <span className="link-icon">🧠</span>
            <span>AI Business Advisor</span>
          </NavLink>
          <NavLink
            to="/ai/description-generator"
            onClick={closeMobileNav}
            className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
          >
            <span className="link-icon">✨</span>
            <span>Description Studio</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-email">{user.email}</span>
          </div>
          <button
            onClick={() => void handleLogout()}
            className="btn btn-logout"
            aria-label="Log out of account"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="main-content-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-hamburger-btn"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-label="Toggle navigation drawer"
            >
              ☰
            </button>
            <div className="topbar-search">
              <span
                className={`topbar-status-dot ${
                  aiStatus === 'configured'
                    ? 'status-online'
                    : aiStatus === 'unconfigured'
                    ? 'status-degraded'
                    : 'status-checking'
                }`}
              ></span>
              <span className="topbar-status-text">
                {aiStatus === 'configured' && 'Gemini 2.5 Flash Active'}
                {aiStatus === 'unconfigured' && 'AI Degraded (Key Missing)'}
                {aiStatus === 'checking' && 'Checking AI Status...'}
              </span>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="user-chip">{user.email}</span>
          </div>
        </header>

        <main className="content-body">{children}</main>
      </div>
    </div>
  );
}

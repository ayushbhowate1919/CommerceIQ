import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

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

  async function handleLogout() {
    await onLogout();
    navigate('/login');
  }

  return (
    <div className="layout-wrapper">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Link to="/dashboard" className="brand-logo">
            <span className="brand-icon">⚡</span>
            <span className="brand-title">CommerceIQ</span>
          </Link>
          <span className="badge-pro">PRO</span>
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
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}>
            <span className="link-icon">📊</span>
            <span>Dashboard</span>
          </NavLink>

          <div className="nav-section-title">Catalog & Inventory</div>
          <NavLink to="/products" className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}>
            <span className="link-icon">📦</span>
            <span>Products</span>
          </NavLink>
          <NavLink to="/inventory" className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}>
            <span className="link-icon">⚠️</span>
            <span>Inventory Health</span>
          </NavLink>

          <div className="nav-section-title">Customer Feedback</div>
          <NavLink to="/reviews" className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}>
            <span className="link-icon">⭐</span>
            <span>Customer Reviews</span>
          </NavLink>

          <div className="nav-section-title">AI Studio</div>
          <NavLink to="/ai/description-generator" className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}>
            <span className="link-icon">✨</span>
            <span>Description Studio</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-email">{user.email}</span>
          </div>
          <button onClick={() => void handleLogout()} className="btn btn-logout">
            Log out
          </button>
        </div>
      </aside>

      <div className="main-content-area">
        <header className="topbar">
          <div className="topbar-search">
            <span className="topbar-status-dot"></span>
            <span className="topbar-status-text">Live Workspace Connected</span>
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

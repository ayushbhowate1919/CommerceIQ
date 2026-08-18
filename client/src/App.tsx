import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

type User = { id: string; name: string; email: string; role: string; createdAt: string };
type AuthResponse = { token: string; user: User };
type AuthContextValue = { user: User | null; isLoading: boolean; authenticate: (path: string, body: object) => Promise<void>; logout: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  const payload = await response.json() as { success: boolean; data?: T; error?: { message: string } };
  if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? 'Request failed.');
  return payload.data as T;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('commerceiq.authToken');
    if (!token) { setIsLoading(false); return; }
    void request<{ user: User }>('/auth/me', {}, token).then(({ user: currentUser }) => setUser(currentUser)).catch(() => localStorage.removeItem('commerceiq.authToken')).finally(() => setIsLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    async authenticate(path, body) {
      const result = await request<AuthResponse>(path, { method: 'POST', body: JSON.stringify(body) });
      localStorage.setItem('commerceiq.authToken', result.token);
      setUser(result.user);
    },
    async logout() {
      const token = localStorage.getItem('commerceiq.authToken');
      if (token) { try { await request('/auth/logout', { method: 'POST' }, token); } catch { /* Local logout must still complete. */ } }
      localStorage.removeItem('commerceiq.authToken');
      setUser(null);
    },
  }), [user, isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth(): AuthContextValue { const context = useContext(AuthContext); if (!context) throw new Error('Auth context is unavailable.'); return context; }

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth(); const location = useLocation();
  if (isLoading) return <main className="auth-page"><p>Loading your account…</p></main>;
  return user ? <>{children}</> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { authenticate } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === 'register';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try { await authenticate(isRegister ? '/auth/register' : '/auth/login', Object.fromEntries(form)); navigate((location.state as { from?: string } | null)?.from ?? '/dashboard', { replace: true }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to continue.'); }
    finally { setSubmitting(false); }
  }
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">CommerceIQ</p><h1>{isRegister ? 'Create your merchant account' : 'Welcome back'}</h1><p>{isRegister ? 'Start with secure access to your commerce workspace.' : 'Sign in to your commerce workspace.'}</p><form onSubmit={submit}>{isRegister && <label>Name<input name="name" autoComplete="name" required /></label>}<label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" minLength={8} autoComplete={isRegister ? 'new-password' : 'current-password'} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button disabled={submitting}>{submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}</button></form><p>{isRegister ? 'Already have an account? ' : 'Need an account? '}<a href={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Register'}</a></p></section></main>;
}

function Dashboard() { const { user, logout } = useAuth(); const navigate = useNavigate(); return <main className="dashboard"><header><div><p className="eyebrow">CommerceIQ</p><h1>Welcome, {user?.name}</h1><p>Your authenticated merchant workspace is ready.</p></div><button onClick={() => void logout().then(() => navigate('/login'))}>Log out</button></header><section className="dashboard-placeholder"><h2>Dashboard coming next</h2><p>Authentication is complete. Commerce data and analytics are intentionally outside this milestone.</p></section></main>; }

function App() { return <BrowserRouter><AuthProvider><Routes><Route path="/register" element={<AuthPage mode="register" />} /><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></AuthProvider></BrowserRouter>; }

export default App;

import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Flame, Loader2 } from 'lucide-react';

const AuthContext = createContext();

const TOKEN_KEY = 'base44_access_token';

function getStoredToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function storeToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}

function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

// ── Simple login screen ───────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await base44.auth.loginViaEmailPassword(email.trim(), password);
      const token = result?.access_token || result?.token || result;
      if (token && typeof token === 'string') {
        storeToken(token);
        base44.auth.setToken(token);
        onLogin(token);
      } else {
        setError('Login failed — unexpected response. Try again.');
      }
    } catch (err) {
      setError(err?.message || 'Invalid email or password.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center">
            <Flame className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-mono font-bold text-foreground tracking-wide">FIREGROUND COMMAND</h1>
            <p className="text-sm text-muted-foreground font-mono mt-1">Sign in to continue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-10 px-3 rounded-md border border-border bg-secondary text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoComplete="email"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-3 rounded-md border border-border bg-secondary text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-mono font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getStoredToken());
  const [checking, setChecking] = useState(!!getStoredToken());

  // On mount, if we have a stored token validate it's still good
  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) { setChecking(false); return; }
    base44.auth.setToken(stored);
    base44.auth.me()
      .then(() => setChecking(false))
      .catch(() => {
        // Token expired or invalid — clear it and show login
        clearToken();
        setToken(null);
        setChecking(false);
      });
  }, []);

  const handleLogin = (newToken) => {
    setToken(newToken);
  };

  const logout = () => {
    clearToken();
    base44.auth.setToken(null);
    setToken(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: true, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

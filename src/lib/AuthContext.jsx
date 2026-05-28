import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Flame, Loader2, Eye, EyeOff } from 'lucide-react';
import DepartmentOnboarding from '@/pages/DepartmentOnboarding';
import { ADMIN_EMAIL } from '@/lib/appConfig';

function needsOnboarding(email) {
  if (!email || email === ADMIN_EMAIL) return false;
  try { return !localStorage.getItem('onboarding_done'); } catch { return false; }
}

const AuthContext = createContext();

const TOKEN_KEY = 'base44_access_token';
const USER_KEY  = 'base44_user_email';

function getStoredToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function getStoredEmail() {
  try { return localStorage.getItem(USER_KEY); } catch { return null; }
}
function storeToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}
function storeEmail(email) {
  try { localStorage.setItem(USER_KEY, email); } catch {}
}
function clearStorage() {
  try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); } catch {}
}

// ── Sign Up Screen ────────────────────────────────────────────────────────────
function SignupScreen({ onSignup, onGoLogin }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    fire_department: '', role: '', password: '', confirm_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  // OTP verification step
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [resending, setResending] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    if (!form.first_name.trim())        return 'First name is required.';
    if (!form.last_name.trim())         return 'Last name is required.';
    if (!form.email.trim())             return 'Email is required.';
    if (!form.phone.trim())             return 'Phone number is required.';
    if (!form.fire_department.trim())   return 'Fire department is required.';
    if (!form.role)                     return 'Role is required.';
    if (!form.password)                 return 'Password is required.';
    if (form.password.length < 8)       return 'Password must be at least 8 characters.';
    if (form.password !== form.confirm_password) return 'Passwords do not match.';
    return null;
  };

  const finishSignup = async (token) => {
    storeToken(token);
    storeEmail(form.email.trim());
    base44.auth.setToken(token);
    // Save extended profile to Registration entity
    try {
      await base44.entities.Registration.create({
        first_name:       form.first_name.trim(),
        last_name:        form.last_name.trim(),
        email:            form.email.trim(),
        phone:            form.phone.trim(),
        fire_department:  form.fire_department.trim(),
        role:             form.role,
      });
    } catch (_) {
      console.warn('Could not save registration profile:', _);
    }
    onSignup(token, form.email.trim(), `${form.first_name.trim()} ${form.last_name.trim()}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      const result = await base44.auth.register({
        email: form.email.trim(),
        password: form.password,
        full_name: `${form.first_name.trim()} ${form.last_name.trim()}`,
      });
      // If register returned a token directly, we're done
      const token = result?.access_token || result?.token;
      if (token && typeof token === 'string') {
        await finishSignup(token);
        return;
      }
      // Otherwise base44 sent an OTP to the email — show verification step
      setOtpStep(true);
    } catch (err) {
      setError(err?.message || 'Signup failed. The email may already be in use.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) { setError('Please enter the verification code.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await base44.auth.verifyOtp({ email: form.email.trim(), otpCode: otp.trim() });
      const token = result?.access_token || result?.token;
      if (!token || typeof token !== 'string') {
        setError('Verification failed — unexpected response. Please try again.');
        setLoading(false);
        return;
      }
      await finishSignup(token);
    } catch (err) {
      setError(err?.message || 'Invalid or expired code. Please try again.');
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError('');
    try {
      await base44.auth.resendOtp(form.email.trim());
    } catch (_) {}
    setResending(false);
  };

  const field = (label, key, props = {}) => (
    <div>
      <label className="block text-xs font-mono text-muted-foreground mb-1.5">
        {label} <span className="text-red-400">*</span>
      </label>
      <input
        value={form[key]}
        onChange={set(key)}
        className="w-full h-10 px-3 rounded-md border border-border bg-secondary text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        {...props}
      />
    </div>
  );

  const header = (
    <div className="flex flex-col items-center gap-3 mb-6">
      <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center">
        <Flame className="w-7 h-7 text-primary" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-mono font-bold text-foreground tracking-wide">FIREGROUND COMMAND</h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          {otpStep ? 'Verify your email' : 'Create your account'}
        </p>
      </div>
    </div>
  );

  // ── OTP verification screen ──
  if (otpStep) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {header}
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-xs font-mono text-muted-foreground text-center">
              A verification code was sent to <span className="text-foreground">{form.email}</span>. Enter it below to activate your account.
            </p>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1.5">
                Verification Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="Enter code from email"
                autoFocus
                className="w-full h-10 px-3 rounded-md border border-border bg-secondary text-sm font-mono text-foreground tracking-widest placeholder:text-muted-foreground placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {error && (
              <p className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-mono font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify & Continue'}
            </button>

            <p className="text-center text-xs font-mono text-muted-foreground">
              Didn't get the code?{' '}
              <button type="button" onClick={handleResendOtp} disabled={resending} className="text-primary hover:underline disabled:opacity-50">
                {resending ? 'Sending…' : 'Resend'}
              </button>
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ── Registration form ──
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {header}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {field('First Name', 'first_name', { placeholder: 'John' })}
            {field('Last Name',  'last_name',  { placeholder: 'Smith' })}
          </div>
          {field('Email', 'email', { type: 'email', placeholder: 'you@walthamfire.org', autoComplete: 'email' })}
          {field('Phone', 'phone', { type: 'tel', placeholder: '(617) 555-0100' })}
          {field('Fire Department', 'fire_department', { placeholder: 'Waltham Fire Department' })}

          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1.5">
              Role <span className="text-red-400">*</span>
            </label>
            <select
              value={form.role}
              onChange={set('role')}
              className="w-full h-10 px-3 rounded-md border border-border bg-secondary text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Select role…</option>
              <option value="chief">Chief</option>
              <option value="deputy_chief">Deputy Chief</option>
              <option value="captain">Captain</option>
              <option value="lieutenant">Lieutenant</option>
              <option value="firefighter">Firefighter</option>
              <option value="ems">EMS</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1.5">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className="w-full h-10 px-3 pr-10 rounded-md border border-border bg-secondary text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1.5">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={form.confirm_password}
              onChange={set('confirm_password')}
              placeholder="Re-enter password"
              autoComplete="new-password"
              className="w-full h-10 px-3 rounded-md border border-border bg-secondary text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {error && (
            <p className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-mono font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account…</> : 'Create Account'}
          </button>

          <p className="text-center text-xs font-mono text-muted-foreground pt-1">
            Already have an account?{' '}
            <button type="button" onClick={onGoLogin} className="text-primary hover:underline">
              Sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

// ── Forgot Password Screen ────────────────────────────────────────────────────
function ForgotPasswordScreen({ onGoLogin }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await base44.auth.resetPasswordRequest(email.trim());
      setSent(true);
    } catch (err) {
      setError(err?.message || 'Could not send reset email. Check the address and try again.');
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
            <p className="text-sm text-muted-foreground font-mono mt-1">Reset your password</p>
          </div>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-5">
              <p className="text-sm font-mono text-green-400 font-bold mb-1">Check your email</p>
              <p className="text-xs font-mono text-muted-foreground">
                A password reset link was sent to <span className="text-foreground">{email}</span>.
                Follow the link to set a new password.
              </p>
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              Didn't get it? Check your spam folder, or{' '}
              <button type="button" onClick={() => setSent(false)} className="text-primary hover:underline">
                try again
              </button>.
            </p>
            <button
              type="button"
              onClick={onGoLogin}
              className="w-full h-10 rounded-md border border-border bg-secondary text-sm font-mono font-bold text-foreground hover:bg-secondary/70 transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs font-mono text-muted-foreground text-center pb-1">
              Enter your account email and we'll send you a reset link.
            </p>
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

            {error && (
              <p className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-mono font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send Reset Link'}
            </button>

            <p className="text-center text-xs font-mono text-muted-foreground">
              <button type="button" onClick={onGoLogin} className="text-primary hover:underline">
                ← Back to Sign In
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onGoSignup, onGoForgot }) {
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
        storeEmail(email.trim());
        base44.auth.setToken(token);
        onLogin(token, email.trim());
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono text-muted-foreground">Password</label>
              <button
                type="button"
                onClick={onGoForgot}
                className="text-xs font-mono text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
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

          <p className="text-center text-xs font-mono text-muted-foreground">
            New to FireCommand?{' '}
            <button type="button" onClick={onGoSignup} className="text-primary hover:underline">
              Create account
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getStoredToken());
  const [userEmail, setUserEmail] = useState(() => getStoredEmail());
  const [checking, setChecking] = useState(!!getStoredToken());
  const [screen, setScreen] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) { setChecking(false); return; }
    base44.auth.setToken(stored);
    base44.auth.me()
      .then((user) => {
        if (user?.email) {
          storeEmail(user.email);
          setUserEmail(user.email);
        }
        setChecking(false);
      })
      .catch(() => {
        clearStorage();
        setToken(null);
        setUserEmail(null);
        setChecking(false);
      });
  }, []);

  const handleLogin = (newToken, email, name = '', isNewUser = false) => {
    setToken(newToken);
    setUserEmail(email);
    if (isNewUser && needsOnboarding(email)) {
      setNewUserName(name);
      setShowOnboarding(true);
    }
  };

  const logout = () => {
    clearStorage();
    base44.auth.setToken(null);
    setToken(null);
    setUserEmail(null);
    setScreen('login');
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!token) {
    if (screen === 'signup') {
      return (
        <SignupScreen
          onSignup={(t, email, name) => { handleLogin(t, email, name, true); }}
          onGoLogin={() => setScreen('login')}
        />
      );
    }
    if (screen === 'forgot') {
      return (
        <ForgotPasswordScreen
          onGoLogin={() => setScreen('login')}
        />
      );
    }
    return (
      <LoginScreen
        onLogin={handleLogin}
        onGoSignup={() => setScreen('signup')}
        onGoForgot={() => setScreen('forgot')}
      />
    );
  }

  if (showOnboarding) {
    return (
      <DepartmentOnboarding
        userEmail={userEmail}
        userName={newUserName}
        onComplete={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: true, userEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

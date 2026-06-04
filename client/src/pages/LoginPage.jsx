import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Lock, Mail, Eye, EyeOff, LogIn, Box } from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result?.success) {
      toast.success('Welcome back');
      navigate('/dashboard');
    } else {
      toast.error(result?.error || 'Invalid credentials');
    }
  };

  return (
    <div className="login-simple-shell">
      <div className="login-simple-card">
        <div className="login-simple-brand">
          <div className="sidebar-logomark"><Box size={18} color="#fff" /></div>
          <div>
            <div className="sidebar-brand" style={{ color: 'var(--text-main)' }}>AssetTrack</div>
            <div className="sidebar-brand-tag" style={{ color: 'var(--text-subtle)' }}>Enterprise v2.0</div>
          </div>
        </div>

        <h1 className="login-simple-title">Welcome back</h1>
        <p className="login-simple-subtitle">Sign in to continue to your dashboard.</p>

        <form onSubmit={handleSubmit} className="login-simple-form">
          <FieldWithIcon icon={<Mail size={15} />} label="Email" htmlFor="email">
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </FieldWithIcon>

          <FieldWithIcon
            icon={<Lock size={15} />}
            label="Password"
            htmlFor="password"
            trailing={
              <button type="button" className="icon-btn" onClick={() => setShowPassword((prev) => !prev)} aria-label="Toggle password visibility">
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          >
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </FieldWithIcon>

          <button type="submit" className="btn btn-primary login-simple-submit" disabled={loading}>
            <LogIn size={15} />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="login-simple-help">Contact your administrator for account credentials.</p>
      </div>
    </div>
  );
}

function FieldWithIcon({ icon, label, htmlFor, trailing, children }) {
  return (
    <label htmlFor={htmlFor} className="form-field" style={{ marginBottom: 12 }}>
      <span className="form-label">{label}</span>
      <div style={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr) auto', gap: 8, alignItems: 'center' }}>
        <span aria-hidden="true" style={{ color: 'var(--text-subtle)' }}>{icon}</span>
        {children}
        {trailing || <span />}
      </div>
    </label>
  );
}

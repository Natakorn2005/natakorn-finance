import React, { useState } from 'react';

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    const savedPassword = localStorage.getItem('app_password') || 'financetrack2026';
    if (password === savedPassword) {
      localStorage.setItem('auth_session', 'true');
      onLogin();
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #3a9e9a 0%, #44A08D 40%, #5aaa50 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Dot pattern overlay — matching your logo style */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        pointerEvents: 'none',
      }} />

      {/* Login Card */}
      <div style={{
        background: '#fff',
        borderRadius: 24,
        padding: '44px 36px',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #3a9e9a, #5aaa50)',
            borderRadius: 18,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(78,205,196,0.35)',
          }}>
            <span style={{
              fontSize: 22, fontWeight: 900,
              fontStyle: 'italic', color: '#fff',
              letterSpacing: '-1px',
            }}>FT</span>
          </div>

          {/* FinanceTrack wordmark */}
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1d2e', letterSpacing: '-0.5px' }}>
            <span style={{ fontWeight: 700, color: '#1a1d2e' }}>Finance</span>
            <span style={{
              fontStyle: 'italic', fontWeight: 900,
              background: 'linear-gradient(135deg, #3a9e9a, #5aaa50)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Track</span>
          </div>
          <p style={{ color: '#7a7f9a', fontSize: 13.5, marginTop: 6 }}>
            Personal Finance Manager
          </p>
        </div>

        {/* Welcome text */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1d2e', marginBottom: 4 }}>
            Welcome back 👋
          </h2>
          <p style={{ fontSize: 13, color: '#7a7f9a' }}>
            Enter your password to continue
          </p>
        </div>

        {/* Password input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            fontSize: 12.5, fontWeight: 600,
            color: '#7a7f9a', display: 'block',
            marginBottom: 8, letterSpacing: '0.2px',
          }}>
            PASSWORD
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%', padding: '12px 44px 12px 14px',
                border: `1.5px solid ${error ? '#ef4444' : '#eaecf0'}`,
                borderRadius: 10, fontSize: 14, outline: 'none',
                boxSizing: 'border-box', transition: 'all 0.18s',
                fontFamily: 'Inter, sans-serif', color: '#1a1d2e',
                background: error ? '#fff5f5' : '#fff',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#4ECDC4';
                e.target.style.boxShadow = '0 0 0 3px rgba(78,205,196,0.15)';
              }}
              onBlur={e => {
                e.target.style.borderColor = error ? '#ef4444' : '#eaecf0';
                e.target.style.boxShadow = 'none';
              }}
              autoFocus
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 16, color: '#7a7f9a',
                padding: 4,
              }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {error && (
            <div style={{
              color: '#ef4444', fontSize: 12.5,
              marginTop: 8, display: 'flex',
              alignItems: 'center', gap: 4,
            }}>
              ❌ {error}
            </div>
          )}
        </div>

        {/* Login button */}
        <button
          onClick={handleLogin}
          style={{
            width: '100%', padding: '13px',
            background: 'linear-gradient(135deg, #3a9e9a, #5aaa50)',
            color: '#fff', border: 'none',
            borderRadius: 99, fontSize: 15,
            fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.18s', fontFamily: 'Inter, sans-serif',
            boxShadow: '0 4px 16px rgba(78,205,196,0.35)',
            letterSpacing: '0.2px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = '0.92';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(78,205,196,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(78,205,196,0.35)';
          }}
        >
          Login →
        </button>

        {/* Hint */}
        <div style={{
          textAlign: 'center', marginTop: 20,
          fontSize: 12, color: '#7a7f9a',
        }}>
          🔒 Your data is stored locally on this device
        </div>

        {/* Default password hint */}
        <div style={{
          marginTop: 12, padding: '10px 14px',
          background: 'linear-gradient(135deg, #e8faf5, #edfaed)',
          borderRadius: 10, fontSize: 12,
          color: '#3a9e9a', textAlign: 'center',
          border: '1px solid rgba(78,205,196,0.2)',
        }}>
          💡 Default password: <strong>financetrack2026</strong>
        </div>
      </div>
    </div>
  );
}

export default Login;
import { useState, useRef } from 'react';
import { apiRequest } from '../api';
import type { User } from '../types';

type Step = 'credentials' | 'send-otp' | 'verify-otp';

interface Props {
  onSuccess: (user: User) => void;
}

export default function AuthFlow({ onSuccess }: Props) {
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Step 1: Login ────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email || !password) { setError('Email and password are required.'); return; }
    setError(''); setLoading(true);
    const res = await apiRequest<{ email: string; message: string }>('POST', '/auth/login', { email, password });
    setLoading(false);
    if (!res.ok) {
      setError((res.data as { message?: string })?.message ?? `Error ${res.status}`);
      return;
    }
    setStep('send-otp');
    setInfo('Credentials valid. Now send the OTP to your email.');
  };

  // ── Step 2: Send OTP ─────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setError(''); setLoading(true);
    const res = await apiRequest('POST', '/auth/send-otp', { email, method: 'email' });
    setLoading(false);
    if (!res.ok) {
      setError((res.data as { message?: string })?.message ?? `Error ${res.status}`);
      return;
    }
    setStep('verify-otp');
    setInfo(`OTP sent to ${email}. Check your inbox.`);
  };

  // ── Step 3: Verify OTP ───────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter all 6 digits.'); return; }
    setError(''); setLoading(true);
    const res = await apiRequest<{ user: User; message: string }>(
      'POST', '/auth/verify-otp?context=login', { email, otp: code }
    );
    setLoading(false);
    if (!res.ok) {
      setError((res.data as { message?: string })?.message ?? `Error ${res.status}`);
      return;
    }
    if (res.data?.user) onSuccess(res.data.user);
    else setError('Unexpected response — no user object returned.');
  };

  // ── OTP input helpers ────────────────────────────────────────────────────
  const handleOtpChange = (i: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) { setOtp(pasted.split('')); e.preventDefault(); }
  };

  const stepIndex = { credentials: 0, 'send-otp': 1, 'verify-otp': 2 }[step];

  return (
    <div className="auth-screen">
      <div className="auth-card">

        {/* ── Logo / Brand ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg,#3b6eff,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: '0 4px 16px rgba(79,127,255,0.4)',
            }}>🩺</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>BrecAI API Tester</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Federated Learning Platform</div>
            </div>
          </div>

          {/* Step indicator */}
          <div className="step-indicator">
            {['Credentials', 'Send OTP', 'Verify OTP'].map((_label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? '1' : 'unset' }}>
                <div className={`step-dot ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}`}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                {i < 2 && <div className={`step-line ${i < stepIndex ? 'done' : ''}`} />}
              </div>
            ))}
          </div>

          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            {step === 'credentials' && 'Sign in to your account'}
            {step === 'send-otp' && 'Two-factor authentication'}
            {step === 'verify-otp' && 'Enter verification code'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {step === 'credentials' && 'Use your Laravel platform credentials'}
            {step === 'send-otp' && 'Send a 6-digit code to your email'}
            {step === 'verify-otp' && `Code sent to ${email}`}
          </div>
        </div>

        {/* ── Info banner ── */}
        {info && !error && (
          <div className="alert alert-info" style={{ marginBottom: 18 }}>
            <span>ℹ️</span><span>{info}</span>
          </div>
        )}

        {/* ── Error banner ── */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 18 }}>
            <span>⚠</span><span>{error}</span>
          </div>
        )}

        {/* ── STEP 1: Credentials ── */}
        {step === 'credentials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Email address</label>
              <input
                id="auth-email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                id="auth-password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <button id="btn-login" className="btn btn-primary btn-full" onClick={handleLogin} disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <><div className="spinner" /> Checking...</> : 'Continue →'}
            </button>

            <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Cookie-based auth:</strong> After OTP verification, an HttpOnly <code style={{ background: 'rgba(79,127,255,0.1)', padding: '1px 5px', borderRadius: 4, color: '#93c5fd' }}>auth_token</code> cookie will be set automatically for all subsequent requests.
            </div>
          </div>
        )}

        {/* ── STEP 2: Send OTP ── */}
        {step === 'send-otp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 24 }}>📧</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{email}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>OTP will be sent to this address</div>
              </div>
            </div>
            <button id="btn-send-otp" className="btn btn-primary btn-full" onClick={handleSendOtp} disabled={loading}>
              {loading ? <><div className="spinner" /> Sending...</> : '📬 Send OTP to Email'}
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => { setStep('credentials'); setError(''); setInfo(''); }}>
              ← Back to login
            </button>
          </div>
        )}

        {/* ── STEP 3: Verify OTP ── */}
        {step === 'verify-otp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="otp-grid" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  className={`otp-cell ${digit ? 'filled' : ''}`}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKey(i, e)}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button id="btn-verify-otp" className="btn btn-primary btn-full" onClick={handleVerifyOtp} disabled={loading}>
              {loading ? <><div className="spinner" /> Verifying...</> : '✓ Verify & Sign In'}
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost btn-full btn-sm" onClick={() => { setStep('send-otp'); setOtp(['','','','','','']); setError(''); setInfo(''); }}>
                Resend OTP
              </button>
              <button className="btn btn-ghost btn-full btn-sm" onClick={() => { setStep('credentials'); setError(''); setInfo(''); }}>
                ← Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

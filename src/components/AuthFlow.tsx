import { useState, useRef, useEffect } from 'react';
import { apiRequest } from '../api';
import type { User } from '../types';

type Step = 'credentials' | 'send-otp' | 'verify-otp';
type Mode = 'login' | 'register';

interface Props {
  onSuccess: (user: User) => void;
}

export default function AuthFlow({ onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<Step>('credentials');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'doctor' | 'org_manager'>('doctor');
  const [orgId, setOrgId] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('clinic');
  const [orgAddress, setOrgAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [organizations, setOrganizations] = useState<{ id: number; name: string; type: string }[]>([]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch organizations for doctor registration
  useEffect(() => {
    if (mode === 'register' && role === 'doctor') {
      (async () => {
        const res = await apiRequest<{ data: any[] }>('GET', '/auth/organizations');
        if (res.ok && res.data) setOrganizations(res.data.data);
      })();
    }
  }, [mode, role]);

  // Ensure CSRF cookie is set before state-changing requests.
  // /sanctum/csrf-cookie lives at the Laravel root (outside /api), so the
  // proxy strips the /api-proxy prefix and appends to the backend base URL.
  // We use a dedicated path that the proxy forwards to the root endpoint.
  const initCsrf = async () => {
    await apiRequest('GET', '/sanctum/csrf-cookie');
  };

  // ── Step 1: Login / Register ─────────────────────────────────────────────
  const handlePrimaryAction = async () => {
    if (!email || !password) { setError('Email and password are required.'); return; }
    if (mode === 'register' && !name) { setError('Full name is required.'); return; }
    
    setError(''); setLoading(true);
    await initCsrf();

    if (mode === 'login') {
      const res = await apiRequest<{ email: string; message: string }>('POST', '/auth/login', { email, password });
      setLoading(false);
      if (!res.ok) {
        setError((res.data as { message?: string })?.message ?? `Error ${res.status}`);
        return;
      }
    } else {
      const body = {
        name, email, password, role,
        phone_number: phoneNumber || undefined,
        organization_id: role === 'doctor' ? Number(orgId) : undefined,
        organization_name: role === 'org_manager' ? orgName : undefined,
        organization_type: role === 'org_manager' ? orgType : undefined,
        organization_address: role === 'org_manager' ? orgAddress : undefined,
      };
      const res = await apiRequest('POST', '/auth/register', body);
      setLoading(false);
      if (!res.ok) {
        setError((res.data as { message?: string })?.message ?? `Error ${res.status}`);
        return;
      }
    }

    setStep('send-otp');
    setInfo(`${mode === 'login' ? 'Credentials' : 'Account'} valid. Now send the OTP to your email.`);
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
      'POST', `/auth/verify-otp?context=${mode}`, { email, otp: code }
    );
    setLoading(false);
    if (!res.ok) {
      setError((res.data as { message?: string })?.message ?? `Error ${res.status}`);
      return;
    }
    
    // Status 202 = Awaiting approval (Backend logic for Doctors)
    if (res.status === 202) {
      setInfo(res.data?.message || 'Identity verified. Awaiting approval.');
      setStep('credentials');
      setMode('login');
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
      <div className="auth-card" style={{ maxWidth: mode === 'register' && step === 'credentials' ? 540 : 440 }}>

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

          <div className="step-indicator">
            {['Start', 'Verify', 'Done'].map((_label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? '1' : 'unset' }}>
                <div className={`step-dot ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}`}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                {i < 2 && <div className={`step-line ${i < stepIndex ? 'done' : ''}`} />}
              </div>
            ))}
          </div>

          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            {step === 'credentials' && (mode === 'login' ? 'Sign in' : 'Create account')}
            {step === 'send-otp' && 'Security Check'}
            {step === 'verify-otp' && 'Verification'}
          </div>
        </div>

        {info && !error && <div className="alert alert-info" style={{ marginBottom: 18 }}><span>ℹ️</span><span>{info}</span></div>}
        {error && <div className="alert alert-error" style={{ marginBottom: 18 }}><span>⚠</span><span>{error}</span></div>}

        {/* ── STEP 1: Credentials / Form ── */}
        {step === 'credentials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'register' && (
              <>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="label">Full Name</label>
                    <input className="input" placeholder="Dr. John Doe" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div style={{ width: 140 }}>
                    <label className="label">Role</label>
                    <select className="input" value={role} onChange={e => setRole(e.target.value as any)}>
                      <option value="doctor">Doctor</option>
                      <option value="org_manager">Manager</option>
                    </select>
                  </div>
                </div>

                {role === 'doctor' ? (
                  <div>
                    <label className="label">Organization</label>
                    <select className="input" value={orgId} onChange={e => setOrgId(e.target.value)}>
                      <option value="">Select Hospital/Clinic...</option>
                      {organizations.map(o => <option key={o.id} value={o.id}>{o.name} ({o.type})</option>)}
                    </select>
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                    <label className="label" style={{ color: 'var(--accent)' }}>Organization Details</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <input className="input" placeholder="Organization Name" value={orgName} onChange={e => setOrgName(e.target.value)} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select className="input" style={{ width: 120 }} value={orgType} onChange={e => setOrgType(e.target.value)}>
                          <option value="clinic">Clinic</option>
                          <option value="hospital">Hospital</option>
                          <option value="laboratory">Lab</option>
                        </select>
                        <input className="input" placeholder="Address" value={orgAddress} onChange={e => setOrgAddress(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="label">Phone Number (Optional)</label>
                  <input className="input" placeholder="06..." value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                </div>
              </>
            )}

            <div>
              <label className="label">Email address</label>
              <input id="auth-email" type="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Password</label>
              <input id="auth-password" type="password" className="input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <button id="btn-primary" className="btn btn-primary btn-full" onClick={handlePrimaryAction} disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <><div className="spinner" /> Working...</> : <>{mode === 'login' ? 'Continue →' : 'Register Account'}</>}
            </button>

            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
              {mode === 'login' ? (
                <>New here? <button className="btn btn-xs btn-ghost" style={{ border: 'none', color: 'var(--accent)' }} onClick={() => setMode('register')}>Create account</button></>
              ) : (
                <>Already have an account? <button className="btn btn-xs btn-ghost" style={{ border: 'none', color: 'var(--accent)' }} onClick={() => setMode('login')}>Sign in</button></>
              )}
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
            <button className="btn btn-ghost btn-full" onClick={() => { setStep('credentials'); setError(''); setInfo(''); }}>← Back</button>
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
              <button className="btn btn-ghost btn-full btn-sm" onClick={handleSendOtp}>Resend</button>
              <button className="btn btn-ghost btn-full btn-sm" onClick={() => setStep('credentials')}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

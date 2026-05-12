import { useState, useEffect } from 'react';
import type { User } from '../types';
import { apiRequest } from '../api';

interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  max_doctors: number;
  max_predictions_per_month: number;
  fl_contribution_allowed: boolean;
  instructor_allowed: boolean;
}

interface Subscription {
  organization: {
    id: number;
    name: string;
    subscription_status: string | null;
    subscription_ends_at: string | null;
  };
  plan: Plan | null;
  subscription: { id: number; status: string; starts_at: string; ends_at: string } | null;
}

type Step = 'check' | 'select-plan' | 'select-months' | 'confirm' | 'redirect' | 'success';

const MONTH_OPTIONS = [
  { value: 1,  label: '1 Month',   discount: null },
  { value: 3,  label: '3 Months',  discount: '5% off' },
  { value: 6,  label: '6 Months',  discount: '10% off' },
  { value: 12, label: '12 Months', discount: '15% off' },
];

function fmt(n: number) { return n === -1 ? '∞' : n.toLocaleString(); }

export default function PaymentWizard({ user, onDone }: { user: User; onDone: () => void }) {
  const [step, setStep]           = useState<Step>('check');
  const [sub, setSub]             = useState<Subscription | null>(null);
  const [plans, setPlans]         = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [months, setMonths]       = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [pollCount, setPollCount] = useState(0);

  // Step 1: Check current subscription
  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await apiRequest<any>('GET', '/org/subscription');
      setLoading(false);
      if (r.ok && r.data) {
        const d: Subscription = r.data.data ?? r.data;
        setSub(d);
        const isActive = d.organization?.subscription_status === 'active'
                      || d.organization?.subscription_status === 'trialing';
        if (isActive) setStep('success');
        else           setStep('select-plan');
      } else {
        setStep('select-plan');
      }
    })();
  }, []);

  // Load plans when needed
  useEffect(() => {
    if (step !== 'select-plan') return;
    (async () => {
      const r = await apiRequest<any>('GET', '/org/plans');
      if (r.ok && r.data) {
        const p = r.data.data ?? r.data;
        setPlans(Array.isArray(p) ? p : []);
      }
    })();
  }, [step]);

  const totalAmount = selectedPlan ? selectedPlan.price * months : 0;

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    setError('');
    const r = await apiRequest<any>('POST', '/org/subscribe', {
      plan_id: selectedPlan.id,
      duration_months: months,
    });
    setLoading(false);
    if (r.ok && r.data) {
      const d = r.data.data ?? r.data;
      setCheckoutUrl(d.checkout_url ?? '');
      setPaymentId(d.payment_id ?? null);
      setStep('redirect');
    } else {
      setError(r.data?.message ?? r.data?.error ?? 'Failed to create checkout.');
    }
  };

  // Poll payment status after redirect
  const startPolling = () => {
    if (!paymentId) return;
    let count = 0;
    const iv = setInterval(async () => {
      count++;
      setPollCount(count);
      const r = await apiRequest<any>('GET', '/org/subscription');
      if (r.ok && r.data) {
        const d: Subscription = r.data.data ?? r.data;
        if (d.organization?.subscription_status === 'active') {
          clearInterval(iv);
          setSub(d);
          setStep('success');
        }
      }
      if (count >= 20) clearInterval(iv); // max 2 min polling
    }, 6000);
  };

  const planColors: Record<string, string> = {
    starter: '#06b6d4',
    pro:     '#8b5cf6',
    gold:    '#f59e0b',
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const cardStyle = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '28px 32px', maxWidth: 680,
  };

  if (loading && step === 'check') return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="spinner" />
        <span style={{ color: 'var(--text-muted)' }}>Checking your subscription…</span>
      </div>
    </div>
  );

  // ── Success: already active ───────────────────────────────────────────────
  if (step === 'success') return (
    <div style={cardStyle}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
        Subscription Active!
      </h2>
      {sub && (
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
          <div>Organization: <strong>{sub.organization?.name}</strong></div>
          <div>Plan: <strong style={{ color: '#22c55e' }}>{sub.plan?.name ?? 'Active'}</strong></div>
          {sub.organization?.subscription_ends_at && (
            <div>Expires: <strong>{new Date(sub.organization.subscription_ends_at).toLocaleDateString()}</strong></div>
          )}
          {sub.plan && (
            <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span className="chip" style={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44' }}>
                👨‍⚕️ {fmt(sub.plan.max_doctors)} doctors
              </span>
              <span className="chip" style={{ background: '#3b82f622', color: '#3b82f6', border: '1px solid #3b82f644' }}>
                🤖 {fmt(sub.plan.max_predictions_per_month)} preds/month
              </span>
              {sub.plan.fl_contribution_allowed && (
                <span className="chip" style={{ background: '#8b5cf622', color: '#8b5cf6', border: '1px solid #8b5cf644' }}>
                  📡 FL Contribution
                </span>
              )}
              {sub.plan.instructor_allowed && (
                <span className="chip" style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44' }}>
                  🎓 Instructors
                </span>
              )}
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button className="btn btn-primary" id="btn-upgrade-plan" onClick={() => setStep('select-plan')} style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>
          ⬆️ Upgrade Plan
        </button>
        <button className="btn" id="btn-done" onClick={onDone} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  // ── Step: Select Plan ─────────────────────────────────────────────────────
  if (step === 'select-plan') return (
    <div style={{ maxWidth: 760 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
        💳 Choose a Subscription Plan
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 24px' }}>
        Select a plan for <strong style={{ color: 'var(--text-primary)' }}>{user.organization?.name ?? 'your organization'}</strong>
      </p>

      {plans.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="spinner" /> Loading plans…
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {plans.map(plan => {
            const c = planColors[plan.slug] ?? '#3b82f6';
            const sel = selectedPlan?.id === plan.id;
            return (
              <div
                key={plan.id}
                id={`plan-card-${plan.slug}`}
                onClick={() => setSelectedPlan(plan)}
                style={{
                  flex: '1 1 200px', maxWidth: 240,
                  background: sel ? `${c}18` : 'var(--bg-card)',
                  border: `2px solid ${sel ? c : 'var(--border)'}`,
                  borderRadius: 16, padding: '20px 20px 16px',
                  cursor: 'pointer', transition: 'all .2s',
                  transform: sel ? 'scale(1.03)' : 'scale(1)',
                  boxShadow: sel ? `0 0 0 4px ${c}22, 0 8px 24px rgba(0,0,0,.3)` : '0 2px 8px rgba(0,0,0,.15)',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>
                  {plan.slug === 'starter' ? '🌱' : plan.slug === 'pro' ? '⚡' : '🥇'}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{plan.name}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 4px' }}>
                  {plan.price.toLocaleString()} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>DZD/mo</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>{plan.description}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    👨‍⚕️ <strong>{fmt(plan.max_doctors)}</strong> doctors
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    🤖 <strong>{fmt(plan.max_predictions_per_month)}</strong> preds/month
                  </div>
                  <div style={{ color: plan.fl_contribution_allowed ? '#22c55e' : 'var(--text-muted)' }}>
                    {plan.fl_contribution_allowed ? '✅' : '❌'} FL Contribution
                  </div>
                  <div style={{ color: plan.instructor_allowed ? '#22c55e' : 'var(--text-muted)' }}>
                    {plan.instructor_allowed ? '✅' : '❌'} Instructors
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <button
          id="btn-next-months"
          className="btn btn-primary"
          disabled={!selectedPlan}
          onClick={() => setStep('select-months')}
          style={{ opacity: selectedPlan ? 1 : 0.4, background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
        >
          Continue →
        </button>
      </div>
    </div>
  );

  // ── Step: Select Duration ─────────────────────────────────────────────────
  if (step === 'select-months') return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setStep('select-plan')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>←</button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Choose Duration — <span style={{ color: planColors[selectedPlan!.slug] ?? '#3b82f6' }}>{selectedPlan!.name}</span>
        </h2>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
        {MONTH_OPTIONS.map(opt => {
          const sel = months === opt.value;
          const total = selectedPlan!.price * opt.value;
          return (
            <div
              key={opt.value}
              id={`months-${opt.value}`}
              onClick={() => setMonths(opt.value)}
              style={{
                flex: '1 1 130px', padding: '16px 14px',
                background: sel ? '#3b82f618' : 'var(--bg-elevated)',
                border: `2px solid ${sel ? '#3b82f6' : 'var(--border)'}`,
                borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                transition: 'all .15s', transform: sel ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: sel ? '#3b82f6' : 'var(--text-primary)' }}>{opt.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 2px' }}>
                {total.toLocaleString()} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>DZD</span>
              </div>
              {opt.discount && (
                <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>{opt.discount}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Order Summary</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {selectedPlan!.name} × {months} month{months > 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
            {totalAmount.toLocaleString()} DZD
          </span>
        </div>
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, padding: '8px 12px', background: '#ef444418', borderRadius: 8 }}>{error}</div>}

      <button
        id="btn-checkout"
        className="btn btn-primary"
        disabled={loading}
        onClick={handleSubscribe}
        style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', width: '100%', padding: '12px', fontSize: 15, fontWeight: 700 }}
      >
        {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Creating checkout…</> : '💳 Proceed to Chargily Checkout'}
      </button>
    </div>
  );

  // ── Step: Redirect to Chargily ────────────────────────────────────────────
  if (step === 'redirect') return (
    <div style={cardStyle}>
      <div style={{ fontSize: 42, marginBottom: 16 }}>🔗</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
        Checkout Ready!
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px' }}>
        Click the button below to open the Chargily payment page. After payment, come back here — we'll detect your payment automatically.
      </p>

      {checkoutUrl && (
        <a
          id="btn-open-chargily"
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={startPolling}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 15,
            background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#000',
            textDecoration: 'none', transition: 'opacity .15s', marginBottom: 20,
          }}
        >
          💳 Open Chargily Checkout ↗
        </a>
      )}

      <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 18px', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Auto-detecting payment…</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="spinner" style={{ width: 14, height: 14 }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Polling subscription status {pollCount > 0 ? `(${pollCount} checks)` : '(will start after you click checkout)'}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
        Payment ID: #{paymentId} · Plan: {selectedPlan?.name} · {months} month{months > 1 ? 's' : ''} · {totalAmount.toLocaleString()} DZD
      </div>

      <button
        id="btn-manual-check"
        className="btn"
        onClick={async () => {
          const r = await apiRequest<any>('GET', '/org/subscription');
          if (r.ok && r.data) {
            const d: Subscription = r.data.data ?? r.data;
            setSub(d);
            if (d.organization?.subscription_status === 'active') setStep('success');
          }
        }}
        style={{ marginTop: 16, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12 }}
      >
        🔄 Check Payment Status Now
      </button>
    </div>
  );

  return null;
}

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

export default function PaymentWizard({ user, onDone }: { user: User; onDone: () => void }) {
  const [step, setStep] = useState<'select-plan' | 'select-duration' | 'checkout' | 'success'>('select-plan');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selPlan, setSelPlan] = useState<Plan | null>(null);
  const [months, setMonths] = useState(1);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest<any>('GET', '/org/plans');
        if (res.ok && res.data) {
          // Standardise data extraction from Laravel's JsonResource or direct arrays
          const raw = res.data.data ?? res.data;
          if (Array.isArray(raw)) {
            setPlans(raw);
          } else {
            console.error('Expected array of plans, got:', raw);
            setError('Received invalid data format from server.');
          }
        } else {
          setError(res.error || 'Failed to connect to the billing server.');
        }
      } catch (err) {
        setError('A network error occurred while fetching plans.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubscribe = async () => {
    if (!selPlan) return;
    setCheckingOut(true);
    setError('');
    // Use the correct route from PaymentController: /org-manager/subscribe
    const res = await apiRequest<{ checkout_url: string }>('POST', '/org/subscribe', {
      plan_id: selPlan.id,
      duration_months: months,
    });
    if (res.ok && res.data?.checkout_url) {
      setCheckoutUrl(res.data.checkout_url);
      setStep('checkout');
      // Automatically open in new tab
      window.open(res.data.checkout_url, '_blank');
    } else {
      setError(res.error || (res.data as any)?.message || 'Failed to create checkout session.');
    }
    setCheckingOut(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60 }}>
      <div className="spinner" style={{ width: 40, height: 40, marginBottom: 16 }} />
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading available plans...</div>
    </div>
  );

  const cardStyle = (active: boolean, color: string): React.CSSProperties => ({
    background: active ? `${color}11` : 'var(--bg-card)',
    border: active ? `2px solid ${color}` : '1px solid var(--border)',
    borderRadius: 24, padding: 32, cursor: 'pointer', transition: 'all 0.2s', flex: 1, minWidth: 280,
    display: 'flex', flexDirection: 'column' as const, gap: 16,
    boxShadow: active ? `0 12px 32px ${color}22` : 'none',
    transform: active ? 'translateY(-4px)' : 'none',
  });

  const planColors: Record<string, string> = {
    starter: '#3b82f6',
    pro: '#a855f7',
    gold: '#f59e0b',
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40 }}>
      {step === 'select-plan' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Subscription Plans</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginTop: 8 }}>Choose the plan that fits your organization's needs.</p>
          </div>
          
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {plans.map(p => {
              const color = planColors[p.slug] || '#4f7fff';
              const isSelected = selPlan?.id === p.id;
              return (
                <div key={p.id} style={cardStyle(isSelected, color)} onClick={() => setSelPlan(p)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color }}>{p.slug}</div>
                    {p.slug === 'pro' && <span style={{ background: color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>POPULAR</span>}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)' }}>{p.price.toLocaleString()}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>DZD/mo</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, minHeight: 48 }}>{p.description}</p>
                  
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-primary)' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👨‍⚕️</span>
                      <strong>{p.max_doctors === -1 ? 'Unlimited' : p.max_doctors}</strong> Doctors
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-primary)' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</span>
                      <strong>{p.max_predictions_per_month === -1 ? 'Unlimited' : p.max_predictions_per_month}</strong> Predictions
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: p.fl_contribution_allowed ? 'var(--success)' : 'var(--text-muted)' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.fl_contribution_allowed ? '✅' : '❌'}</span>
                      FL Contribution
                    </div>
                  </div>
                </div>
              );
            })}
            
            {plans.length === 0 && !error && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                No subscription plans are currently available.
              </div>
            )}

            {error && (
              <div style={{ maxWidth: 400, padding: 24, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid var(--danger)', borderRadius: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
                <div style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: 8 }}>Unable to load plans</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>{error}</div>
                <button className="btn btn-sm" onClick={() => window.location.reload()}>Try Again</button>
              </div>
            )}
          </div>
          
          {plans.length > 0 && (
            <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                style={{ padding: '16px 48px', fontSize: 16, borderRadius: 16, height: 'auto', opacity: selPlan ? 1 : 0.5 }} 
                disabled={!selPlan} 
                onClick={() => setStep('select-duration')}
              >
                Select {selPlan?.name || 'a Plan'} →
              </button>
            </div>
          )}
        </>
      )}

      {step === 'select-duration' && selPlan && (
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>Select Duration</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Choose your billing cycle for <strong>{selPlan.name}</strong></p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              { m: 1, disc: 0 },
              { m: 3, disc: 5 },
              { m: 6, disc: 10 },
              { m: 12, disc: 15 },
            ].map(d => (
              <div key={d.m} onClick={() => setMonths(d.m)} style={{
                padding: 24, borderRadius: 20, border: months === d.m ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: months === d.m ? 'rgba(79, 127, 255, 0.05)' : 'var(--bg-elevated)', cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.2s', transform: months === d.m ? 'scale(1.02)' : 'scale(1)',
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{d.m} Month{d.m > 1 ? 's' : ''}</div>
                <div style={{ fontSize: 15, color: 'var(--text-muted)', marginTop: 4 }}>
                  {Math.round(selPlan.price * d.m * (1 - d.disc/100)).toLocaleString()} DZD
                </div>
                {d.disc > 0 && <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--success)', marginTop: 8, background: 'rgba(34, 197, 94, 0.1)', padding: '2px 8px', borderRadius: 10, display: 'inline-block' }}>{d.disc}% OFF</div>}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, padding: 24, background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Summary</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, color: 'var(--text-primary)' }}>{selPlan.name} × {months} mo</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                {Math.round(selPlan.price * months * (1 - (months === 1 ? 0 : months === 3 ? 0.05 : months === 6 ? 0.1 : 0.15))).toLocaleString()} DZD
              </div>
            </div>
          </div>

          {error && <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: 12, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
            <button className="btn" style={{ flex: 1, height: 52, borderRadius: 16, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} onClick={() => setStep('select-plan')}>Back</button>
            <button className="btn btn-primary" style={{ flex: 2, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }} disabled={checkingOut} onClick={handleSubscribe}>
              {checkingOut ? <div className="spinner" /> : '💳 Proceed to Chargily Checkout'}
            </button>
          </div>
        </div>
      )}

      {step === 'checkout' && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ width: 88, height: 88, borderRadius: 32, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, margin: '0 auto 32px', boxShadow: '0 16px 32px rgba(245, 158, 11, 0.2)' }}>🏦</div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Complete Payment</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.6 }}>
              Hello <strong>{user.name}</strong>, we've opened the secure Chargily payment gateway in a new tab. Please complete the transaction there to activate your subscription.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 320, margin: '0 auto' }}>
              <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: 'none', background: '#f59e0b', color: '#fff', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16 }}>Open Payment Page ↗</a>
              <button className="btn" style={{ height: 52, borderRadius: 16, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} onClick={() => onDone()}>🔄 I have completed payment</button>
              <button className="btn" style={{ background: 'transparent', color: 'var(--text-muted)' }} onClick={() => setStep('select-duration')}>Cancel</button>
            </div>
          </div>
      )}
    </div>
  );
}

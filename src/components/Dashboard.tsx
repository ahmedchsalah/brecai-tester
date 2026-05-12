import { useState, useEffect, useCallback } from 'react';
import { ENDPOINT_GROUPS } from '../types';
import type { User, EndpointGroup, Endpoint } from '../types';
import EndpointPanel from './EndpointPanel';
import { apiRequest } from '../api';
import PaymentWizard from './PaymentWizard';
import PredictionWizard from './PredictionWizard';

interface Props {
  user: User;
  onLogout: () => void;
}

const roleColor: Record<string, string> = {
  admin: '#ef4444',
  org_manager: '#22c55e',
  doctor: '#3b82f6',
  instructor: '#a855f7',
};

// ── KPI card component ────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, sub, color = '#3b82f6' }: {
  label: string; value: string | number; icon: string;
  sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
      minWidth: 160, flex: '1 1 160px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      transition: 'transform .15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: `${color}22`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 20,
        border: `1px solid ${color}33`,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── KPI Section ───────────────────────────────────────────────────────────────
function KpiSection({ role }: { role: string }) {
  const [kpis, setKpis] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  const pathMap: Record<string, string> = {
    admin:       '/admin/insights/kpis',
    org_manager: '/org/insights/kpis',
    doctor:      '/doctor/insights/kpis',
    instructor:  '/fl/insights/kpis',
  };

  useEffect(() => {
    const p = pathMap[role];
    if (!p) { setLoading(false); return; }
    apiRequest<any>('GET', p).then(r => {
      if (r.ok && r.data) setKpis(r.data.data ?? r.data);
      setLoading(false);
    });
  }, [role]);

  if (loading) return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{
          height: 70, flex: '1 1 160px', borderRadius: 12,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          animation: 'pulse 1.4s ease-in-out infinite',
        }} />
      ))}
    </div>
  );
  if (!kpis) return null;

  const adminCards = [
    { key: 'total_organizations',     label: 'Total Orgs',        icon: '🏢', color: '#f59e0b' },
    { key: 'active_organizations',    label: 'Active Orgs',       icon: '✅', color: '#22c55e' },
    { key: 'pending_organizations',   label: 'Pending Orgs',      icon: '⏳', color: '#f97316' },
    { key: 'total_users',             label: 'Total Users',       icon: '👥', color: '#3b82f6' },
    { key: 'doctors_count',           label: 'Doctors',           icon: '🩺', color: '#06b6d4' },
    { key: 'org_managers_count',      label: 'Org Managers',      icon: '🏥', color: '#22c55e' },
    { key: 'total_patients',          label: 'Patients',          icon: '🧑‍🤝‍🧑', color: '#8b5cf6' },
    { key: 'total_predictions',       label: 'Total Predictions', icon: '🤖', color: '#ec4899' },
    { key: 'completed_predictions',   label: 'Completed Preds',   icon: '✔️', color: '#22c55e' },
    { key: 'failed_predictions',      label: 'Failed Preds',      icon: '❌', color: '#ef4444' },
    { key: 'wsi_uploads',             label: 'WSI Uploads',       icon: '🔬', color: '#0ea5e9' },
    { key: 'xai_results_generated',   label: 'XAI Results',       icon: '🧠', color: '#a855f7' },
    { key: 'fl_rounds_completed',     label: 'FL Rounds Done',    icon: '🔄', color: '#14b8a6' },
    { key: 'fl_contributions',        label: 'FL Contributions',  icon: '📡', color: '#6366f1' },
    { key: 'active_subscriptions',    label: 'Active Subs',       icon: '💳', color: '#f59e0b' },
    { key: 'total_revenue_dzd',       label: 'Total Revenue',     icon: '💰', color: '#22c55e', fmt: (v: number) => `${v.toLocaleString()} DA` },
    { key: 'monthly_revenue_dzd',     label: 'Month Revenue',     icon: '📈', color: '#3b82f6', fmt: (v: number) => `${v.toLocaleString()} DA` },
  ];

  const orgCards = [
    { key: 'total_members',         label: 'Members',            icon: '👥', color: '#22c55e' },
    { key: 'total_patients',        label: 'Patients',           icon: '🧑‍🤝‍🧑', color: '#8b5cf6' },
    { key: 'total_predictions',     label: 'Predictions',        icon: '🤖', color: '#3b82f6' },
    { key: 'completed_predictions', label: 'Completed',          icon: '✔️', color: '#22c55e' },
    { key: 'total_examinations',    label: 'Examinations',       icon: '📋', color: '#f59e0b' },
    { key: 'total_reports',         label: 'Reports',            icon: '📄', color: '#06b6d4' },
    { key: 'wsi_uploads',           label: 'WSI Uploads',        icon: '🔬', color: '#0ea5e9' },
    { key: 'fl_contributions',      label: 'FL Contributions',   icon: '📡', color: '#6366f1' },
  ];

  const doctorCards = [
    { key: 'my_patients',            label: 'My Patients',       icon: '🧑‍🤝‍🧑', color: '#8b5cf6' },
    { key: 'my_examinations',        label: 'Examinations',      icon: '📋', color: '#f59e0b' },
    { key: 'pending_examinations',   label: 'Pending Exams',     icon: '⏳', color: '#f97316' },
    { key: 'my_predictions',         label: 'Predictions',       icon: '🤖', color: '#3b82f6' },
    { key: 'completed_predictions',  label: 'Completed',         icon: '✔️', color: '#22c55e' },
    { key: 'failed_predictions',     label: 'Failed',            icon: '❌', color: '#ef4444' },
    { key: 'my_reports',             label: 'Reports',           icon: '📄', color: '#06b6d4' },
    { key: 'finalized_reports',      label: 'Finalized',         icon: '🔒', color: '#22c55e' },
  ];

  const flCards = [
    { key: 'total_rounds',           label: 'Total Rounds',      icon: '🔄', color: '#8b5cf6' },
    { key: 'completed_rounds',       label: 'Completed',         icon: '✅', color: '#22c55e' },
    { key: 'active_round',           label: 'Active Round',      icon: '⚡', color: '#f59e0b' },
    { key: 'total_contributions',    label: 'Contributions',     icon: '📡', color: '#3b82f6' },
  ];

  const cardsByRole: Record<string, typeof adminCards> = {
    admin: adminCards, org_manager: orgCards, doctor: doctorCards, instructor: flCards,
  };

  const cards = cardsByRole[role] ?? adminCards;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
      {cards.map(({ key, label, icon, color, fmt }) => {
        const val = kpis[key] ?? 0;
        const display = fmt ? fmt(Number(val)) : val;
        return <KpiCard key={key} label={label} value={display} icon={icon} color={color} />;
      })}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ user, onLogout }: Props) {
  const [view, setView] = useState<'overview' | 'endpoints' | 'payment' | 'prediction'>('overview');
  const [selectedGroup, setSelectedGroup] = useState<EndpointGroup>(ENDPOINT_GROUPS[0]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint>(ENDPOINT_GROUPS[0].endpoints[0]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const userRole = user.role ?? 'user';
  const rc = roleColor[userRole] ?? '#4f7fff';

  // Automated feature: if org manager and no active sub, auto-take to payment
  useEffect(() => {
    if (userRole === 'org_manager' && !user.organization?.subscription_status) {
      setView('payment');
    }
  }, [userRole, user.organization?.subscription_status]);

  const filteredGroups = ENDPOINT_GROUPS.map(group => ({
    ...group,
    endpoints: group.endpoints.filter(ep =>
      ep.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.path.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.endpoints.length > 0);

  const handleLogout = async () => {
    setLoggingOut(true);
    await apiRequest('POST', '/auth/logout');
    setLoggingOut(false);
    onLogout();
  };

  const selectEndpoint = (group: EndpointGroup, ep: Endpoint) => {
    setSelectedGroup(group);
    setSelectedEndpoint(ep);
    setView('endpoints');
  };

  const toggleGroup = (id: string) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const navItems = [
    { id: 'overview',   label: 'Overview',   icon: '📊' },
    { id: 'endpoints',  label: 'API Tester', icon: '⚡' },
    ...(userRole === 'org_manager' ? [{ id: 'payment',   label: 'Payment Flow',   icon: '💳' }] : []),
    ...(userRole === 'doctor'      ? [{ id: 'prediction', label: 'Prediction Flow', icon: '🤖' }] : []),
  ];

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#3b6eff,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🩺</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>BrecAI API Tester</span>
        </div>

        {/* Nav tabs */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 20 }}>
          {navItems.map(n => (
            <button
              key={n.id}
              id={`nav-tab-${n.id}`}
              onClick={() => setView(n.id as any)}
              style={{
                background: view === n.id ? `${rc}22` : 'transparent',
                border: view === n.id ? `1px solid ${rc}44` : '1px solid transparent',
                borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
                color: view === n.id ? rc : 'var(--text-secondary)',
                fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all .15s',
              }}
            >
              {n.icon} {n.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</div>
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: `linear-gradient(135deg, ${rc}, #7c3aed)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff',
          }}>
            {user.name[0].toUpperCase()}
          </div>
          <span className="chip" style={{ background: `${rc}22`, color: rc, border: `1px solid ${rc}44` }}>{userRole}</span>
          {user.organization && (
            <span className="chip" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
              🏥 {user.organization.name}
            </span>
          )}
          <button id="btn-logout" className="btn btn-danger btn-sm" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? <><div className="spinner" style={{ borderTopColor: '#ef4444' }} />…</> : 'Logout'}
          </button>
        </div>
      </header>

      {/* ── Views ── */}
      {view === 'overview' && (
        <main style={{ padding: '24px 28px', overflowY: 'auto', height: 'calc(100vh - 56px)' }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Welcome back, {user.name.split(' ')[0]} 👋
            </h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {user.organization?.name ?? 'Global Platform'} · Role: <span style={{ color: rc }}>{userRole}</span>
              {user.organization?.subscription_status && (
                <span style={{ marginLeft: 8 }}>
                  · Subscription: <span style={{ color: user.organization.subscription_status === 'active' ? '#22c55e' : '#f59e0b' }}>
                    {user.organization.subscription_status}
                  </span>
                </span>
              )}
            </div>
          </div>
          <KpiSection role={userRole} />

          {/* Quick Actions */}
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
              Quick Actions
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {userRole === 'org_manager' && (
                <>
                  <button id="qa-payment" className="btn btn-primary" onClick={() => setView('payment')}
                    style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                    💳 Subscribe / Pay
                  </button>
                  <button id="qa-members" className="btn" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    onClick={() => { const g = ENDPOINT_GROUPS.find(g => g.id === 'org-manager')!; selectEndpoint(g, g.endpoints.find(e => e.id === 'org-members')!); }}>
                    👥 Manage Members
                  </button>
                </>
              )}
              {userRole === 'doctor' && (
                <>
                  <button id="qa-prediction" className="btn btn-primary" onClick={() => setView('prediction')}
                    style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
                    🤖 Run AI Prediction
                  </button>
                  <button id="qa-patients" className="btn" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    onClick={() => { const g = ENDPOINT_GROUPS.find(g => g.id === 'doctor')!; selectEndpoint(g, g.endpoints.find(e => e.id === 'doc-patients')!); }}>
                    👤 My Patients
                  </button>
                </>
              )}
              {userRole === 'admin' && (
                <>
                  <button id="qa-orgs" className="btn btn-primary"
                    onClick={() => { const g = ENDPOINT_GROUPS.find(g => g.id === 'admin-orgs')!; selectEndpoint(g, g.endpoints.find(e => e.id === 'admin-orgs-list')!); }}>
                    🏢 Organizations
                  </button>
                  <button id="qa-users" className="btn" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    onClick={() => { const g = ENDPOINT_GROUPS.find(g => g.id === 'admin-users')!; selectEndpoint(g, g.endpoints.find(e => e.id === 'admin-users-list')!); }}>
                    👥 All Users
                  </button>
                </>
              )}
              <button id="qa-api" className="btn" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onClick={() => setView('endpoints')}>
                ⚡ API Tester
              </button>
            </div>
          </div>
        </main>
      )}

      {view === 'payment' && (
        <main style={{ padding: '24px 28px', overflowY: 'auto', height: 'calc(100vh - 56px)' }}>
          <button id="btn-back-payment" onClick={() => setView('overview')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Back to Overview
          </button>
          <PaymentWizard user={user} onDone={() => setView('overview')} />
        </main>
      )}

      {view === 'prediction' && (
        <main style={{ padding: '24px 28px', overflowY: 'auto', height: 'calc(100vh - 56px)' }}>
          <button id="btn-back-prediction" onClick={() => setView('overview')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Back to Overview
          </button>
          <PredictionWizard user={user} />
        </main>
      )}

      {view === 'endpoints' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px)' }}>
          {/* Sidebar */}
          <aside className="app-sidebar">
            <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                Search Endpoints
              </div>
              <input
                type="text" className="input"
                style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6 }}
                placeholder="Filter by name or path..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ padding: '12px 16px 8px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {filteredGroups.reduce((acc, g) => acc + g.endpoints.length, 0)} results across {filteredGroups.length} groups
              </div>
            </div>
            {filteredGroups.map(group => {
              const isOpen = !collapsed[group.id] || searchQuery.length > 0;
              const isActiveGroup = selectedGroup.id === group.id;
              return (
                <div key={group.id}>
                  <div
                    className={`sidebar-group-header ${isActiveGroup ? 'active' : ''}`}
                    onClick={() => toggleGroup(group.id)}
                    style={{ marginTop: 4 }}
                  >
                    <span>{group.icon}</span>
                    <span style={{ flex: 1 }}>{group.label}</span>
                    <span style={{ fontSize: 10, opacity: 0.5 }}>{isOpen ? '▾' : '▸'}</span>
                    <span style={{ fontSize: 10, background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 10, color: 'var(--text-muted)' }}>
                      {group.endpoints.length}
                    </span>
                  </div>
                  {isOpen && group.endpoints.map(ep => (
                    <div
                      key={ep.id}
                      id={`nav-${ep.id}`}
                      className={`sidebar-item ${selectedEndpoint.id === ep.id ? 'active' : ''}`}
                      onClick={() => selectEndpoint(group, ep)}
                    >
                      <span className={`method-badge method-${ep.method}`} style={{ fontSize: 9, padding: '1px 5px' }}>{ep.method}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.label}</span>
                    </div>
                  ))}
                </div>
              );
            })}
            <div style={{ height: 24 }} />
          </aside>
          <main className="app-main">
            <EndpointPanel key={selectedEndpoint.id} endpoint={selectedEndpoint} />
          </main>
        </div>
      )}
    </div>
  );
}

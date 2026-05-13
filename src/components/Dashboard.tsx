import { useState, useEffect } from 'react';
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

  // 🛡️ CRITICAL GATE: If Org Manager and org is NOT active/approved, block EVERYTHING.
  // We use both 'status' and 'is_active' (user level) to be safe.
  const isPendingOrg = userRole === 'org_manager' && 
                       (user.organization?.status === 'pending' || !user.organization?.status);

  if (isPendingOrg) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c', padding: 20 }}>
        <div style={{ maxWidth: 500, width: '100%', background: '#121214', borderRadius: 28, padding: 48, border: '1px solid #222', textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
          <div style={{ width: 88, height: 88, borderRadius: 32, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, margin: '0 auto 28px' }}>⏳</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 14, letterSpacing: '-0.5px' }}>Account Pending Approval</h1>
          <p style={{ color: '#999', fontSize: 16, lineHeight: 1.6, marginBottom: 36 }}>
            The organization <strong>{user.organization?.name}</strong> is currently undergoing administrative review. 
            Access to the platform is restricted until your application is approved.
          </p>
          <div style={{ padding: '18px 24px', background: '#1a1a1c', borderRadius: 16, border: '1px solid #333', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 12px #f59e0b' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#eee' }}>Status: Awaiting Verification</span>
          </div>
          <button onClick={onLogout} className="btn btn-danger" style={{ width: '100%', height: 52, borderRadius: 16, fontWeight: 700 }}>Logout</button>
        </div>
      </div>
    );
  }

  // Automated feature: if org manager, approved, and no active sub, auto-take to payment
  useEffect(() => {
    if (userRole === 'org_manager' && 
        user.organization?.status === 'active' && 
        user.organization?.subscription_status !== 'active' &&
        view === 'overview') {
      setView('payment');
    }
  }, [userRole, user.organization?.status, user.organization?.subscription_status, view]);

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
    ...(userRole === 'org_manager' && user.organization?.subscription_status !== 'active' ? [{ id: 'payment',   label: 'Payment Flow',   icon: '💳' }] : []),
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
          <button id="btn-logout" className="btn btn-danger btn-sm" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? <div className="spinner" /> : 'Logout'}
          </button>
        </div>
      </header>

      {/* ── Sidebar (Only for Endpoints view) ── */}
      <aside className="app-sidebar" style={{ display: view === 'endpoints' ? 'flex' : 'none' }}>
        <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)' }}>
          <input
            type="text" className="input"
            style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6 }}
            placeholder="Filter..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filteredGroups.map(group => {
            const isOpen = !collapsed[group.id] || searchQuery.length > 0;
            const isActiveGroup = selectedGroup.id === group.id;
            return (
              <div key={group.id}>
                <div className={`sidebar-group-header ${isActiveGroup ? 'active' : ''}`} onClick={() => toggleGroup(group.id)}>
                  <span>{group.icon}</span>
                  <span style={{ flex: 1 }}>{group.label}</span>
                  <span style={{ fontSize: 10 }}>{isOpen ? '▾' : '▸'}</span>
                </div>
                {isOpen && group.endpoints.map(ep => (
                  <div key={ep.id} id={`nav-${ep.id}`} className={`sidebar-item ${selectedEndpoint.id === ep.id ? 'active' : ''}`} onClick={() => selectEndpoint(group, ep)}>
                    <span className={`method-badge method-${ep.method}`} style={{ fontSize: 9, padding: '1px 5px' }}>{ep.method}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.label}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="app-main" style={{ gridColumn: view === 'endpoints' ? '2' : '1 / -1' }}>
        {view === 'overview' && (
          <div style={{ padding: '24px 28px' }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Welcome back, {user.name.split(' ')[0]} 👋
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {user.organization?.name ?? 'Global Platform'} · Role: <span style={{ color: rc }}>{userRole}</span>
              </div>
            </div>
            <KpiSection role={userRole} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Quick Actions</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {userRole === 'org_manager' && user.organization?.subscription_status !== 'active' && <button id="qa-payment" className="btn btn-primary" onClick={() => setView('payment')}>💳 Subscribe</button>}
              {userRole === 'doctor' && <button id="qa-prediction" className="btn btn-primary" onClick={() => setView('prediction')}>🤖 AI Prediction</button>}
              <button id="qa-api" className="btn" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} onClick={() => setView('endpoints')}>⚡ API Tester</button>
            </div>
          </div>
        )}

        {view === 'payment' && (
          <div style={{ padding: '24px 28px' }}>
            <button onClick={() => setView('overview')} className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>← Back</button>
            <PaymentWizard user={user} onDone={() => setView('overview')} />
          </div>
        )}

        {view === 'prediction' && (
          <div style={{ padding: '24px 28px' }}>
            <button onClick={() => setView('overview')} className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>← Back</button>
            <PredictionWizard user={user} />
          </div>
        )}

        {view === 'endpoints' && (
          <EndpointPanel key={selectedEndpoint.id} endpoint={selectedEndpoint} />
        )}
      </main>
    </div>
  );
}

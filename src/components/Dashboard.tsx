import { useState } from 'react';
import { ENDPOINT_GROUPS } from '../types';
import type { User, EndpointGroup, Endpoint } from '../types';
import EndpointPanel from './EndpointPanel';
import { apiRequest } from '../api';

interface Props {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: Props) {
  const [selectedGroup, setSelectedGroup] = useState<EndpointGroup>(ENDPOINT_GROUPS[0]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint>(ENDPOINT_GROUPS[0].endpoints[0]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
  };

  const toggleGroup = (id: string) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const roleColor: Record<string, string> = {
    admin: '#ef4444', org_manager: '#22c55e', doctor: '#3b82f6', instructor: '#a855f7',
  };
  const userRole = user.roles[0] ?? 'user';

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#3b6eff,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🩺</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>BrecAI API Tester</span>
        </div>

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16 }}>
          <div className="live-dot" />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>laravel.cloud</span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</div>
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: `linear-gradient(135deg, ${roleColor[userRole] ?? '#4f7fff'}, #7c3aed)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff',
          }}>
            {user.name[0].toUpperCase()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="chip" style={{
              background: `${roleColor[userRole]}22`,
              color: roleColor[userRole] ?? '#4f7fff',
              border: `1px solid ${roleColor[userRole] ?? '#4f7fff'}44`,
            }}>{userRole}</span>
            {user.organization && (
              <span className="chip" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                🏥 {user.organization.name}
              </span>
            )}
          </div>
          <button id="btn-logout" className="btn btn-danger btn-sm" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? <><div className="spinner" style={{ borderTopColor: '#ef4444' }} />…</> : 'Logout'}
          </button>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <aside className="app-sidebar">
        <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
            Search Endpoints
          </div>
          <input
            type="text"
            className="input"
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
          const isOpen = !collapsed[group.id] || searchQuery.length > 0; // auto-expand on search
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

        {/* Bottom padding */}
        <div style={{ height: 24 }} />
      </aside>

      {/* ── Main Content ── */}
      <main className="app-main">
        <EndpointPanel key={selectedEndpoint.id} endpoint={selectedEndpoint} />
      </main>
    </div>
  );
}

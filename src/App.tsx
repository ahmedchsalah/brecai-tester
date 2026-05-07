import { useState, useEffect } from 'react';
import AuthFlow from './components/AuthFlow';
import Dashboard from './components/Dashboard';
import type { User } from './types';
import { apiRequest } from './api';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  // On mount — silently try /auth/me to restore session from cookie
  useEffect(() => {
    (async () => {
      const res = await apiRequest<User>('GET', '/auth/me');
      if (res.ok && res.data) setUser(res.data as User);
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#3b6eff,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🩺</div>
          <div className="spinner" style={{ width: 22, height: 22 }} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Restoring session…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthFlow onSuccess={u => setUser(u)} />;
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
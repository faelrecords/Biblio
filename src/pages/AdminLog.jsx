import { useEffect, useMemo, useState } from 'react';
import { api, getProfile } from '../api';

function formatDetails(details) {
  const entries = Object.entries(details || {}).filter(([, value]) => (
    value !== '' && value !== null && value !== undefined && value !== '[oculto]'
  ));
  if (!entries.length) return '';
  return entries.map(([key, value]) => {
    const formatted = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `${key}: ${formatted}`;
  }).join(' · ');
}

export default function AdminLog() {
  const profile = getProfile();
  const [items, setItems] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api.get('/audit-logs?limit=500').then(setItems).catch(err => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items || [];
    return (items || []).filter(item => (
      `${item.admin_name} ${item.action} ${item.path} ${formatDetails(item.details)}`.toLowerCase().includes(query)
    ));
  }, [items, search]);

  async function remove(item) {
    if (!confirm(`Excluir este registro do Log?\n\n${item.action}`)) return;
    setBusyId(item.id);
    setError('');
    try {
      await api.del(`/audit-logs/${item.id}`);
      setItems(current => current.filter(entry => entry.id !== item.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!items && !error) return <div className="container"><div className="spinner" /></div>;

  return (
    <div className="container">
      <div className="subtitle">Administração</div>
      <h1 style={{ marginBottom: 8 }}>Log</h1>
      <p className="hero-sub">Histórico das ações realizadas pelos administradores.</p>

      {error && <div className="error-msg">{error}</div>}
      <div className="glass list-card" style={{ marginBottom: 18 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Buscar no log</label>
          <input
            className="input"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Administrador, ação ou registro"
          />
        </div>
      </div>

      <div className="glass list-card">
        {filtered.length === 0 && <div className="empty-state">Nenhuma ação registrada.</div>}
        {filtered.map(item => {
          const details = formatDetails(item.details);
          return (
            <div className="list-row audit-log-row" key={item.id}>
              <div className="avatar">{(item.admin_name || '?').charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="list-main-title">{item.action}</div>
                <div className="list-main-sub">
                  {item.admin_name} · {new Date(item.created_at).toLocaleString('pt-BR')}
                </div>
                {details && <div className="audit-log-details">{details}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span className="badge pending">{item.method}</span>
                {profile?.is_super && (
                  <button className="btn sm danger" disabled={busyId === item.id} onClick={() => remove(item)}>
                    Excluir
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

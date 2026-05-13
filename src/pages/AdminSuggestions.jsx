import { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminSuggestions() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get('/suggestions').then(setItems);
  }, []);

  if (!items) return <div className="container"><div className="spinner" /></div>;

  return (
    <div className="container">
      <div className="subtitle">Feedback</div>
      <h1 style={{ marginBottom: 24 }}>Sugestões</h1>
      <div className="glass list-card">
        {items.length === 0 && <div className="empty-state">Nenhuma sugestão enviada.</div>}
        {items.map(item => (
          <div key={item.id} className="list-row" style={{ alignItems: 'flex-start' }}>
            <div className="avatar">{(item.user_name || '?').charAt(0).toUpperCase()}</div>
            <div>
              <div className="list-main-title">{item.title || 'Sugestão'}</div>
              <div className="list-main-sub">
                {item.user_name} · {new Date(item.created_at).toLocaleString('pt-BR')}
              </div>
              <p style={{ marginTop: 10, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

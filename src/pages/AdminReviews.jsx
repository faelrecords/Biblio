import { useEffect, useState } from 'react';
import { api } from '../api';

function Stars({ value }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <svg key={star} width="18" height="18" viewBox="0 0 24 24" fill={star <= value ? '#f5c25b' : 'none'} stroke={star <= value ? '#f5c25b' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function AdminReviews() {
  const [items, setItems] = useState(null);

  const load = () => api.get('/reviews').then(setItems);

  useEffect(() => {
    load();
  }, []);

  async function remove(id) {
    if (!confirm('Excluir avaliação?')) return;
    await api.del(`/reviews/${id}`);
    load();
  }

  if (!items) return <div className="container"><div className="spinner" /></div>;

  return (
    <div className="container">
      <div className="subtitle">Leituras</div>
      <h1 style={{ marginBottom: 24 }}>Avaliações</h1>
      <div className="glass list-card">
        {items.length === 0 && <div className="empty-state">Nenhuma avaliação enviada.</div>}
        {items.map(item => (
          <div key={item.id} className="list-row" style={{ alignItems: 'flex-start' }}>
            <div className="list-cover">
              <img src={item.cover_url || 'https://placehold.co/88x132/1a1a1b/706f70?text=?'} alt="" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="list-main-title">{item.book_title}</div>
              <div className="list-main-sub">
                {item.user_name} · {new Date(item.created_at).toLocaleString('pt-BR')}
              </div>
              <div style={{ marginTop: 8 }}><Stars value={item.rating} /></div>
              {item.comment && <p style={{ marginTop: 10, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.comment}</p>}
            </div>
            <button className="btn sm danger" onClick={() => remove(item.id)}>Excluir</button>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api';

function fmt(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminWaitlist() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await api.get('/waitlist');
    setList(data); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id) {
    if (!confirm('Remover da fila?')) return;
    await api.del(`/waitlist/${id}`); load();
  }

  if (loading) return <div className="container"><div className="spinner" /></div>;

  // agrupar por livro
  const byBook = {};
  for (const w of list) {
    (byBook[w.book_id] = byBook[w.book_id] || { title: w.book_title, cover: w.cover_url, items: [] }).items.push(w);
  }

  return (
    <div className="container">
      <div className="subtitle">Aguardando vez</div>
      <h1 style={{ marginBottom: 20 }}>Fila de espera</h1>

      {list.length === 0 && (
        <div className="glass list-card"><div className="empty-state">Nenhuma pessoa na fila no momento.</div></div>
      )}

      {Object.entries(byBook).map(([bookId, group]) => (
        <div key={bookId} className="glass list-card" style={{ marginBottom: 14 }}>
          <div className="toolbar" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="list-cover" style={{ width: 50 }}>
                <img src={group.cover || `https://placehold.co/88x132/1a1a1b/706f70?text=?`} alt="" />
              </div>
              <div>
                <h2 style={{ marginBottom: 2 }}>{group.title}</h2>
                <div className="hint">{group.items.length} pessoa(s) na fila</div>
              </div>
            </div>
          </div>
          {group.items.map((w, idx) => (
            <div key={w.id} className="list-row">
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--accent-dim)', color: 'var(--accent-text)',
                display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14
              }}>{idx + 1}</div>
              <div>
                <div className="list-main-title">{w.user_name}</div>
                <div className="list-main-sub">entrou em {fmt(w.created_at)}</div>
              </div>
              <button className="btn sm danger" onClick={() => remove(w.id)}>Remover</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api';

function currentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toInputDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function AdminReads() {
  const [list, setList] = useState([]);
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('month');
  const [month, setMonth] = useState(currentYM());
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  function params() {
    const p = new URLSearchParams();
    if (mode === 'month' && month) {
      p.set('start', month);
      p.set('end', month);
    } else if (mode === 'range') {
      if (start) p.set('start', start);
      if (end) p.set('end', end);
    }
    return p.toString();
  }

  async function load() {
    setLoading(true);
    const qs = params();
    const [stats, reads, userList, bookList] = await Promise.all([
      api.get(`/stats/reads?${qs}`),
      api.get(`/reads?${qs}`),
      api.get('/users'),
      api.get('/books')
    ]);
    setList(stats);
    setEntries(reads);
    setUsers(userList);
    setBooks(bookList);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [mode, month, start, end]);

  function openEdit(entry) {
    setErr('');
    setEditing({
      id: entry.id,
      user_id: entry.user_id,
      book_id: entry.book_id,
      returned_at: toInputDateTime(entry.returned_at)
    });
  }

  async function saveEntry() {
    setErr('');
    try {
      await api.put(`/reads/${editing.id}`, {
        user_id: Number(editing.user_id),
        book_id: Number(editing.book_id),
        returned_at: new Date(editing.returned_at).toISOString()
      });
      setEditing(null);
      load();
    } catch (error) {
      setErr(error.message);
    }
  }

  async function deleteEntry(id) {
    if (!confirm('Excluir registro de leitura?')) return;
    await api.del(`/reads/${id}`);
    load();
  }

  const total = list.reduce((acc, x) => acc + x.count, 0);

  return (
    <div className="container">
      <div className="subtitle">Leitura</div>
      <h1 style={{ marginBottom: 20 }}>Ranking de leitores</h1>

      <div className="admin-tabs">
        <button className={`admin-tab ${mode === 'month' ? 'active' : ''}`} onClick={() => setMode('month')}>Por mês</button>
        <button className={`admin-tab ${mode === 'range' ? 'active' : ''}`} onClick={() => setMode('range')}>Período</button>
        <button className={`admin-tab ${mode === 'all' ? 'active' : ''}`} onClick={() => setMode('all')}>Todo o histórico</button>
      </div>

      {mode === 'month' && (
        <div className="glass list-card" style={{ marginBottom: 16, maxWidth: 320 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Mês</label>
            <input type="month" className="input" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
        </div>
      )}

      {mode === 'range' && (
        <div className="glass list-card" style={{ marginBottom: 16 }}>
          <div className="grid-2">
            <div className="field" style={{ margin: 0 }}>
              <label>De</label>
              <input type="date" className="input" value={start} onChange={e => setStart(e.target.value)} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Até</label>
              <input type="date" className="input" value={end} onChange={e => setEnd(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {loading && <div className="spinner" />}

      {!loading && (
        <>
          <div className="glass stat-card" style={{ marginBottom: 16, textAlign: 'center' }}>
            <div className="stat-label">Total de leituras no período</div>
            <div className="stat-value accent">{total}</div>
          </div>

          <div className="glass list-card" style={{ marginBottom: 18 }}>
            {list.length === 0
              ? <div className="empty-state">Nenhuma leitura registrada no período.</div>
              : list.map((r, idx) => (
                <div key={r.user_id} className="list-row">
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: idx === 0 ? 'linear-gradient(135deg, #f5c25b, #b8860b)'
                              : idx === 1 ? 'linear-gradient(135deg, #c0c0c0, #888)'
                              : idx === 2 ? 'linear-gradient(135deg, #cd7f32, #8b5a2b)'
                              : 'var(--accent-dim)',
                    color: idx < 3 ? '#0b0b0b' : 'var(--accent-text)',
                    display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14
                  }}>{idx + 1}</div>
                  <div>
                    <div className="list-main-title">{r.user_name}</div>
                  </div>
                  <div>
                    <span className="badge approved">{r.count} {r.count === 1 ? 'livro' : 'livros'}</span>
                  </div>
                </div>
              ))}
          </div>

          <div className="subtitle">Registros</div>
          <div className="glass list-card">
            {entries.length === 0
              ? <div className="empty-state">Nenhum registro editável no período.</div>
              : entries.map(entry => (
                <div key={entry.id} className="list-row">
                  <div className="list-cover">
                    <img src={entry.cover_url || 'https://placehold.co/88x132/1a1a1b/706f70?text=?'} alt="" />
                  </div>
                  <div>
                    <div className="list-main-title">{entry.book_title}</div>
                    <div className="list-main-sub">
                      {entry.user_name} · {new Date(entry.returned_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="actions">
                    <button className="btn sm" onClick={() => openEdit(entry)}>Editar</button>
                    <button className="btn sm danger" onClick={() => deleteEntry(entry.id)}>Excluir</button>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal glass glass-strong" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <button className="modal-close" onClick={() => setEditing(null)}>×</button>
            <div className="subtitle">Registro</div>
            <h2 style={{ marginBottom: 16 }}>Editar leitura</h2>
            {err && <div className="error-msg">{err}</div>}
            <div className="field">
              <label>Usuário</label>
              <select className="input" value={editing.user_id} onChange={e => setEditing({ ...editing, user_id: e.target.value })}>
                {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Livro</label>
              <select className="input" value={editing.book_id} onChange={e => setEditing({ ...editing, book_id: e.target.value })}>
                {books.map(book => <option key={book.id} value={book.id}>{book.title}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Data da leitura</label>
              <input
                type="datetime-local"
                className="input"
                value={editing.returned_at}
                onChange={e => setEditing({ ...editing, returned_at: e.target.value })}
              />
            </div>
            <div className="modal-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn ghost" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn primary" onClick={saveEntry} disabled={!editing.user_id || !editing.book_id || !editing.returned_at}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

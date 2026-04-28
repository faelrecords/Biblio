import { useEffect, useState } from 'react';
import { api, getProfile } from '../api';
import CoverUpload from '../components/CoverUpload';
import ApprovalModal from '../components/ApprovalModal';
import BookSearchModal from '../components/BookSearchModal';

const empty = {
  title: '', author: '', category: '', cover_url: '', synopsis: '',
  default_days: 14,
  auto_approve_override: 'inherit', // 'inherit' | 'auto' | 'manual'
  waitlist_hold_hours: ''
};

export default function AdminBooks() {
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [selfLoanBook, setSelfLoanBook] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const me = getProfile();

  async function load() {
    const [b, u] = await Promise.all([api.get('/books'), api.get('/users')]);
    setBooks(b); setUsers(u);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing('new'); setForm(empty); setSearchOpen(false);
  }
  function openEdit(b) {
    setEditing(b.id);
    let aa = 'inherit';
    if (b.auto_approve_override === true) aa = 'auto';
    else if (b.auto_approve_override === false) aa = 'manual';
    setForm({
      title: b.title, author: b.author, category: b.category,
      cover_url: b.cover_url, synopsis: b.synopsis,
      default_days: b.default_days || 14,
      auto_approve_override: aa,
      waitlist_hold_hours: typeof b.waitlist_hold_hours === 'number' ? String(b.waitlist_hold_hours) : ''
    });
    setSearchOpen(false);
  }

  async function save() {
    let auto_approve_override = null;
    if (form.auto_approve_override === 'auto') auto_approve_override = true;
    else if (form.auto_approve_override === 'manual') auto_approve_override = false;
    const payload = {
      title: form.title, author: form.author, category: form.category,
      cover_url: form.cover_url, synopsis: form.synopsis,
      default_days: parseInt(form.default_days, 10) || 14,
      auto_approve_override,
      waitlist_hold_hours: form.waitlist_hold_hours === '' ? null : parseInt(form.waitlist_hold_hours, 10)
    };
    if (editing === 'new') await api.post('/books', payload);
    else await api.put(`/books/${editing}`, payload);
    setEditing(null); load();
  }

  async function remove(id) {
    if (!confirm('Excluir livro?')) return;
    await api.del(`/books/${id}`); load();
  }

  if (loading) return <div className="container"><div className="spinner" /></div>;

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <div className="subtitle">Acervo</div>
          <h1>Livros</h1>
        </div>
        <button className="btn accent" onClick={openNew}>+ Novo livro</button>
      </div>

      <div className="glass list-card">
        {books.length === 0 && <div className="empty-state">Nenhum livro cadastrado.</div>}
        {books.map(b => (
          <div key={b.id} className="list-row">
            <div className="list-cover">
              <img src={b.cover_url || `https://placehold.co/88x132/1a1a1b/706f70?text=?`} alt="" />
            </div>
            <div>
              <div className="list-main-title">{b.title}</div>
              <div className="list-main-sub">
                {b.author} · {b.category} · {b.default_days || 14} dias
                {b.auto_approve_override === true && <span className="badge approved" style={{ marginLeft: 8 }}>auto</span>}
                {b.auto_approve_override === false && <span className="badge pending" style={{ marginLeft: 8 }}>manual</span>}
                {b.status === 'borrowed' && <span className="badge approved" style={{ marginLeft: 8 }}>emprestado</span>}
                {b.status === 'pending' && <span className="badge pending" style={{ marginLeft: 8 }}>em análise</span>}
                {b.waitlist_count > 0 && <span className="badge pending" style={{ marginLeft: 8 }}>{b.waitlist_count} na fila</span>}
              </div>
            </div>
            <div className="actions">
              {b.status === 'available' && (
                <button className="btn sm accent" onClick={() => setSelfLoanBook(b)}>
                  Auto-empréstimo
                </button>
              )}
              <button className="btn sm" onClick={() => openEdit(b)}>Editar</button>
              <button className="btn sm danger" onClick={() => remove(b.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal glass glass-strong" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setEditing(null)}>×</button>
            <div className="subtitle">{editing === 'new' ? 'Cadastro' : 'Edição'}</div>
            <h2 style={{ marginBottom: 16 }}>{editing === 'new' ? 'Novo livro' : 'Editar livro'}</h2>

            {editing === 'new' && (
              <div className="field">
                <button type="button" className="btn ghost block" onClick={() => setSearchOpen(true)}
                        style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                  🔎 Buscar livro online (Google Books + Open Library)
                </button>
                <div className="hint">Abre catálogo com capas para escolher. Ou preencha manualmente abaixo.</div>
              </div>
            )}

            <div className="field">
              <label>Título</label>
              <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Autor</label>
                <input className="input" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} />
              </div>
              <div className="field">
                <label>Categoria</label>
                <input className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Dias padrão</label>
                <input type="number" min={1} className="input" value={form.default_days}
                       onChange={e => setForm({ ...form, default_days: e.target.value })} />
              </div>
              <div className="field">
                <label>Aprovação</label>
                <select className="input" value={form.auto_approve_override}
                        onChange={e => setForm({ ...form, auto_approve_override: e.target.value })}>
                  <option value="inherit">Seguir configuração geral</option>
                  <option value="auto">Sempre automática</option>
                  <option value="manual">Sempre manual (precisa aprovar)</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Tempo de hold para fila (horas) — em branco usa padrão geral</label>
              <input type="number" min={0} className="input" value={form.waitlist_hold_hours}
                     onChange={e => setForm({ ...form, waitlist_hold_hours: e.target.value })}
                     placeholder="Ex: 24, 48..." />
              <div className="hint">Quando o livro for devolvido com fila, o primeiro tem este tempo para retirar antes do próximo.</div>
            </div>

            <div className="field">
              <label>Capa</label>
              <CoverUpload value={form.cover_url} onChange={url => setForm({ ...form, cover_url: url })} />
            </div>
            {form.cover_url && (
              <div style={{ marginTop: 8, width: 80, height: 120, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <img src={form.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div className="field">
              <label>Sinopse</label>
              <textarea className="textarea" value={form.synopsis} onChange={e => setForm({ ...form, synopsis: e.target.value })} />
            </div>

            <div className="modal-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn ghost" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn primary" onClick={save} disabled={!form.title}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {selfLoanBook && (
        <ApprovalModal
          book={selfLoanBook}
          selfApprove
          currentUser={me}
          users={users}
          onClose={() => setSelfLoanBook(null)}
          onDone={() => { setSelfLoanBook(null); load(); }}
        />
      )}

      {searchOpen && (
        <BookSearchModal
          initialQuery={form.title}
          onClose={() => setSearchOpen(false)}
          onPick={(item) => { setForm({ ...form, ...item }); setSearchOpen(false); }}
        />
      )}
    </div>
  );
}

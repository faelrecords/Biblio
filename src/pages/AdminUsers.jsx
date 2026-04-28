import { useEffect, useState } from 'react';
import { api, getProfile } from '../api';
import CoverUpload from '../components/CoverUpload';

const emptyForm = { name: '', email: '', access_code: '', is_admin: false, password: '', avatar_url: '' };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [err, setErr] = useState('');
  const [showCreated, setShowCreated] = useState(null);
  const me = getProfile();

  async function load() {
    const data = await api.get('/users');
    setUsers(data); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing('new'); setForm(emptyForm); setErr(''); }
  function openEdit(u) {
    setEditing(u.id);
    setForm({
      name: u.name, email: u.email || '', access_code: u.access_code,
      is_admin: !!u.is_admin, password: '',
      avatar_url: u.avatar_url || ''
    });
    setErr('');
  }

  async function save() {
    setErr('');
    try {
      if (editing === 'new') {
        const r = await api.post('/users', form);
        setShowCreated({ name: form.name, code: r.access_code, is_admin: r.is_admin });
      } else {
        await api.put(`/users/${editing}`, form);
      }
      setEditing(null); load();
    } catch (e) { setErr(e.message); }
  }

  async function regen(id) {
    if (!confirm('Gerar novo código aleatório?')) return;
    const r = await api.post(`/users/${id}/regenerate-code`, {});
    alert(`Novo código: ${r.access_code}`);
    load();
  }

  async function remove(id) {
    if (!confirm('Excluir usuário? Empréstimos dele também serão removidos.')) return;
    await api.del(`/users/${id}`); load();
  }

  function copy(txt) { navigator.clipboard.writeText(txt); }

  if (loading) return <div className="container"><div className="spinner" /></div>;

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <div className="subtitle">Pessoas</div>
          <h1>Usuários</h1>
        </div>
        <button className="btn accent" onClick={openNew}>+ Novo usuário</button>
      </div>

      <div className="glass list-card">
        {users.length === 0 && <div className="empty-state">Nenhum usuário cadastrado.</div>}
        {users.map(u => {
          const protectedUser = u.is_super && me?.id !== u.id;
          return (
          <div key={u.id} className="list-row">
            <div className="avatar">{u.name.charAt(0).toUpperCase()}</div>
            <div>
              <div className="list-main-title">
                {u.name}
                {u.is_super && <span className="badge approved" style={{ marginLeft: 8 }}>super admin</span>}
                {!u.is_super && u.is_admin && <span className="badge approved" style={{ marginLeft: 8 }}>admin</span>}
              </div>
              <div className="list-main-sub">
                {u.email || 'sem email'} ·{' '}
                <span className="code-display" onClick={() => copy(u.access_code)} title="clique para copiar">
                  {u.access_code}
                </span>{' '}
                · <strong style={{ color: 'var(--text-secondary)' }}>{u.books_read || 0}</strong> livros lidos
              </div>
            </div>
            <div className="actions">
              {protectedUser ? (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '6px 10px' }}>
                  🔒 protegido
                </span>
              ) : (
                <>
                  <button className="btn sm" onClick={() => openEdit(u)}>Editar</button>
                  <button className="btn sm ghost" onClick={() => regen(u.id)} title="gerar código aleatório">↻</button>
                  {!u.is_super && <button className="btn sm danger" onClick={() => remove(u.id)}>Excluir</button>}
                </>
              )}
            </div>
          </div>
        );})}
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal glass glass-strong" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <button className="modal-close" onClick={() => setEditing(null)}>×</button>
            <div className="subtitle">{editing === 'new' ? 'Cadastro' : 'Edição'}</div>
            <h2 style={{ marginBottom: 16 }}>{editing === 'new' ? 'Novo usuário' : 'Editar usuário'}</h2>

            {err && <div className="error-msg">{err}</div>}

            <div className="field">
              <label>Nome</label>
              <input className="input" autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Email (opcional)</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Foto (opcional, aparece no ranking)</label>
              <CoverUpload value={form.avatar_url} onChange={url => setForm({ ...form, avatar_url: url })} />
              {form.avatar_url && (
                <img src={form.avatar_url} alt="" style={{
                  marginTop: 8, width: 60, height: 60, objectFit: 'cover',
                  borderRadius: '50%', border: '1px solid var(--border)'
                }} />
              )}
            </div>
            <div className="field">
              <label>Código de acesso</label>
              <input className="input" style={{ fontFamily: 'SF Mono, Menlo, monospace', letterSpacing: 1 }}
                     value={form.access_code}
                     onChange={e => setForm({ ...form, access_code: e.target.value.toUpperCase() })}
                     placeholder={editing === 'new' ? 'Em branco gera aleatório' : ''} />
            </div>

            <div className="field">
              <label>Perfil</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button"
                  className={`btn ${!form.is_admin ? 'accent' : 'ghost'}`}
                  style={{ flex: 1 }}
                  onClick={() => setForm({ ...form, is_admin: false, password: '' })}>
                  Leitor
                </button>
                <button type="button"
                  className={`btn ${form.is_admin ? 'accent' : 'ghost'}`}
                  style={{ flex: 1 }}
                  onClick={() => setForm({ ...form, is_admin: true })}>
                  Administrador
                </button>
              </div>
            </div>

            {form.is_admin && (
              <div className="field">
                <label>{editing === 'new' ? 'Senha' : 'Nova senha (em branco mantém a atual)'}</label>
                <input className="input" type="password" value={form.password}
                       onChange={e => setForm({ ...form, password: e.target.value })}
                       placeholder="mínimo 4 caracteres" />
                <div className="hint">
                  Admin pode logar usando nome ou código + senha, e também pegar livros.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn ghost" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn primary" onClick={save} disabled={!form.name}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {showCreated && (
        <div className="modal-backdrop" onClick={() => setShowCreated(null)}>
          <div className="modal glass glass-strong small" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <button className="modal-close" onClick={() => setShowCreated(null)}>×</button>
            <div style={{ fontSize: 40, marginBottom: 4, color: 'var(--accent-text)' }}>✓</div>
            <h2 style={{ marginBottom: 8 }}>Usuário criado</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 18, fontSize: 13 }}>
              Código de <strong>{showCreated.name}</strong>
              {showCreated.is_admin && <> · perfil <strong>admin</strong></>}:
            </p>
            <div style={{
              padding: 20, background: 'var(--accent-dim)',
              border: '1px solid rgba(109, 113, 240, 0.3)',
              borderRadius: 'var(--glass-radius-sm)',
              fontFamily: 'SF Mono, Menlo, monospace', fontSize: 26,
              color: 'var(--accent-text)', letterSpacing: 3, fontWeight: 700, marginBottom: 18
            }}>
              {showCreated.code}
            </div>
            <button className="btn accent" onClick={() => { copy(showCreated.code); setShowCreated(null); }}>
              Copiar e fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

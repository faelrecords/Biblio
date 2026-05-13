import { useEffect, useState } from 'react';
import { api } from '../api';

function dateInput(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function fmtDateTime(iso) {
  if (!iso) return 'nunca';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [cleanup, setCleanup] = useState({ start: dateInput(90), end: dateInput(0), message: '' });
  const [message, setMessage] = useState('');
  const [generalNotice, setGeneralNotice] = useState({ title: 'Aviso da biblioteca', message: '', result: '', error: '' });

  async function load() {
    const [s, c] = await Promise.all([api.get('/settings'), api.get('/categories')]);
    setSettings(s);
    setCategories(c || []);
  }

  useEffect(() => { load(); }, []);

  async function patchSettings(patch) {
    const s = await api.put('/settings', patch);
    setSettings(s);
  }

  async function addCategory(event) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    await api.post('/categories', { name });
    setCategoryName('');
    setMessage('Categoria cadastrada.');
    load();
  }

  async function removeCategory(name) {
    if (!confirm(`Excluir categoria "${name}"?`)) return;
    await api.del(`/categories/${encodeURIComponent(name)}`);
    setMessage('Categoria excluída.');
    load();
  }

  async function cleanupNotifications() {
    if (!cleanup.start || !cleanup.end) return;
    if (!confirm('Excluir notificações desse período?')) return;
    const result = await api.post('/notifications/cleanup', {
      start: `${cleanup.start}T00:00:00`,
      end: `${cleanup.end}T23:59:59`
    });
    setSettings(result.settings);
    setCleanup(current => ({ ...current, message: `${result.deleted} notificações excluídas.` }));
  }

  async function sendGeneralNotice(event) {
    event.preventDefault();
    setGeneralNotice(current => ({ ...current, result: '', error: '' }));
    try {
      const result = await api.post('/notifications/send-all', {
        title: generalNotice.title,
        message: generalNotice.message
      });
      setGeneralNotice({ title: 'Aviso da biblioteca', message: '', result: `${result.sent} usuários notificados.`, error: '' });
    } catch (error) {
      setGeneralNotice(current => ({ ...current, error: error.message }));
    }
  }

  if (!settings) return <div className="container"><div className="spinner" /></div>;

  return (
    <div className="container">
      <div className="subtitle">Administração</div>
      <h1 style={{ marginBottom: 24 }}>Configurações</h1>

      <div className="glass list-card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 14 }}>Empréstimos e ranking</h2>
        <div className="toolbar" style={{ marginBottom: 14 }}>
          <div>
            <div className="section-title" style={{ margin: 0 }}>Empréstimo automático</div>
            <div className="hint">Padrão geral. Cada livro pode sobrescrever.</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={settings.auto_approve}
                   onChange={e => patchSettings({ auto_approve: e.target.checked })} />
            <span className="track"></span>
          </label>
        </div>
        <div className="toolbar" style={{ marginBottom: 14 }}>
          <div>
            <div className="section-title" style={{ margin: 0 }}>Top 3 leitores</div>
            <div className="hint">Mostra ranking mensal no catálogo.</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={settings.show_top_readers}
                   onChange={e => patchSettings({ show_top_readers: e.target.checked })} />
            <span className="track"></span>
          </label>
        </div>
        <div className="grid-2">
          <div className="field" style={{ margin: 0 }}>
            <label>Dias padrão fallback</label>
            <input type="number" min={1} className="input" value={settings.default_days}
                   onChange={e => {
                     const n = parseInt(e.target.value, 10);
                     if (n > 0) patchSettings({ default_days: n });
                   }} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Hold padrão da fila (horas)</label>
            <input type="number" min={0} className="input" value={settings.default_waitlist_hold_hours}
                   onChange={e => {
                     const n = parseInt(e.target.value, 10);
                     if (n >= 0) patchSettings({ default_waitlist_hold_hours: n });
                   }} />
          </div>
        </div>
      </div>

      <div className="glass list-card" style={{ marginBottom: 20 }}>
        <div className="toolbar" style={{ marginBottom: 14 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>Categorias</h2>
            <div className="hint">{categories.length} categoria{categories.length === 1 ? '' : 's'} cadastrada{categories.length === 1 ? '' : 's'}</div>
          </div>
        </div>
        {message && <div className="success-msg">{message}</div>}
        <form onSubmit={addCategory} className="category-form" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input className="input" value={categoryName}
                 onChange={e => { setCategoryName(e.target.value); setMessage(''); }}
                 placeholder="Nova categoria" />
          <button className="btn accent" aria-label="Cadastrar categoria">+</button>
        </form>
        {categories.length === 0 && <div className="empty-state">Nenhuma categoria cadastrada.</div>}
        <div className="category-chip-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {categories.map(name => (
            <div key={name} className="category-chip" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px 8px 12px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600
            }}>
              <span>{name}</span>
              <button
                type="button"
                onClick={() => removeCategory(name)}
                aria-label={`Excluir ${name}`}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass list-card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 14 }}>Aviso geral da biblioteca</h2>
        {generalNotice.result && <div className="success-msg">{generalNotice.result}</div>}
        {generalNotice.error && <div className="error-msg">{generalNotice.error}</div>}
        <form onSubmit={sendGeneralNotice}>
          <div className="field">
            <label>Título</label>
            <input className="input" value={generalNotice.title}
                   onChange={e => setGeneralNotice({ ...generalNotice, title: e.target.value, result: '', error: '' })} />
          </div>
          <div className="field">
            <label>Aviso</label>
            <textarea className="textarea" value={generalNotice.message}
                      onChange={e => setGeneralNotice({ ...generalNotice, message: e.target.value, result: '', error: '' })}
                      placeholder="Mensagem para todos os usuários..." />
          </div>
          <button className="btn accent" disabled={!generalNotice.message.trim()}>Enviar para todos</button>
        </form>
      </div>

      <div className="glass list-card">
        <h2 style={{ marginBottom: 14 }}>Limpeza de notificações</h2>
        <div className="hint" style={{ marginBottom: 14 }}>
          Última limpeza: {fmtDateTime(settings.notifications_last_cleanup_at)}
        </div>
        {cleanup.message && <div className="success-msg">{cleanup.message}</div>}
        <div className="grid-2">
          <div className="field" style={{ margin: 0 }}>
            <label>Data inicial</label>
            <input className="input" type="date" value={cleanup.start}
                   onChange={e => setCleanup({ ...cleanup, start: e.target.value, message: '' })} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Data final</label>
            <input className="input" type="date" value={cleanup.end}
                   onChange={e => setCleanup({ ...cleanup, end: e.target.value, message: '' })} />
          </div>
        </div>
        <div className="toolbar" style={{ marginTop: 14, marginBottom: 0 }}>
          <div className="hint">O lembrete volta 90 dias após limpeza.</div>
          <button className="btn danger" onClick={cleanupNotifications}>Excluir notificações</button>
        </div>
      </div>
    </div>
  );
}

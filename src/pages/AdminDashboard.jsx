import { useEffect, useState } from 'react';
import { api } from '../api';
import ApprovalModal from '../components/ApprovalModal';

function daysLeft(dueAt) {
  if (!dueAt) return null;
  return Math.ceil((new Date(dueAt) - new Date()) / 86400000);
}

function dateInput(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function fmtDateTime(iso) {
  if (!iso) return 'nunca';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminDashboard() {
  const [loans, setLoans] = useState([]);
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [settings, setSettings] = useState({
    auto_approve: true,
    default_days: 14,
    default_waitlist_hold_hours: 24,
    show_top_readers: false,
    notifications_last_cleanup_at: null,
    notifications_cleanup_reminder_sent: false
  });
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [cleanup, setCleanup] = useState({ start: dateInput(90), end: dateInput(0), message: '' });

  async function load() {
    const [l, b, u, w, s] = await Promise.all([
      api.get('/loans'), api.get('/books'), api.get('/users'),
      api.get('/waitlist'), api.get('/settings')
    ]);
    setLoans(l); setBooks(b); setUsers(u); setWaitlist(w); setSettings(s);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function patchSettings(patch) {
    const s = await api.put('/settings', patch);
    setSettings(s);
  }

  async function cleanupNotifications() {
    if (!cleanup.start || !cleanup.end) return;
    if (!window.confirm('Excluir notificações desse período?')) return;
    const result = await api.post('/notifications/cleanup', {
      start: `${cleanup.start}T00:00:00`,
      end: `${cleanup.end}T23:59:59`
    });
    setSettings(result.settings);
    setCleanup(current => ({ ...current, message: `${result.deleted} notificações excluídas.` }));
  }

  if (loading) return <div className="container"><div className="spinner" /></div>;

  const active = loans.filter(l => l.status === 'approved');
  const pending = loans.filter(l => l.status === 'pending');
  const overdue = active.filter(l => daysLeft(l.due_at) < 0);

  return (
    <div className="container">
      <div className="subtitle">Visão geral</div>
      <h1 style={{ marginBottom: 24 }}>Painel administrativo</h1>

      <div className="stats-grid">
        <div className="glass stat-card">
          <div className="stat-label">Livros</div>
          <div className="stat-value">{books.length}</div>
        </div>
        <div className="glass stat-card">
          <div className="stat-label">Usuários</div>
          <div className="stat-value">{users.length}</div>
        </div>
        <div className="glass stat-card">
          <div className="stat-label">Ativos</div>
          <div className="stat-value accent">{active.length}</div>
        </div>
        <div className="glass stat-card">
          <div className="stat-label">Pendentes</div>
          <div className={`stat-value ${pending.length ? 'warn' : ''}`}>{pending.length}</div>
        </div>
        <div className="glass stat-card">
          <div className="stat-label">Atrasados</div>
          <div className={`stat-value ${overdue.length ? 'danger' : ''}`}>{overdue.length}</div>
        </div>
        <div className="glass stat-card">
          <div className="stat-label">Fila</div>
          <div className="stat-value">{waitlist.length}</div>
        </div>
      </div>

      <div className="glass list-card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 14 }}>Configurações</h2>

        <div className="toolbar" style={{ marginBottom: 14 }}>
          <div>
            <div className="section-title" style={{ margin: 0 }}>Empréstimo automático</div>
            <div className="hint">Padrão para todos os livros (cada livro pode sobrescrever individualmente).</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={settings.auto_approve}
                   onChange={e => patchSettings({ auto_approve: e.target.checked })} />
            <span className="track"></span>
          </label>
        </div>

        <div className="toolbar" style={{ marginBottom: 14 }}>
          <div>
            <div className="section-title" style={{ margin: 0 }}>Top 3 leitores na página inicial</div>
            <div className="hint">Mostra ranking público do mês com foto (ou nome se não houver foto).</div>
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
          <div className="hint">O lembrete volta 90 dias após a limpeza.</div>
          <button className="btn danger" onClick={cleanupNotifications}>Excluir notificações</button>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="glass list-card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 14 }}>Aguardando aprovação</h2>
          {pending.map(l => (
            <div key={l.id} className="list-row">
              <div className="list-cover">
                <img src={l.cover_url || `https://placehold.co/88x132/1a1a1b/706f70?text=?`} alt="" />
              </div>
              <div>
                <div className="list-main-title">{l.book_title}</div>
                <div className="list-main-sub">Solicitado por {l.user_name}</div>
              </div>
              <div className="actions">
                <button className="btn sm success" onClick={() => setApproving(l)}>Aprovar</button>
                <button className="btn sm danger" onClick={async () => { await api.post(`/loans/${l.id}/reject`, {}); load(); }}>Negar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass list-card">
        <h2 style={{ marginBottom: 14 }}>Empréstimos ativos</h2>
        {active.length === 0 && <div className="empty-state">Nenhum empréstimo ativo.</div>}
        {active.map(l => {
          const dl = daysLeft(l.due_at);
          return (
            <div key={l.id} className="list-row">
              <div className="list-cover">
                <img src={l.cover_url || `https://placehold.co/88x132/1a1a1b/706f70?text=?`} alt="" />
              </div>
              <div>
                <div className="list-main-title">{l.book_title}</div>
                <div className="list-main-sub">
                  Com {l.user_name}
                  {l.renewed_count > 0 && <> · renovado {l.renewed_count}x</>}
                  {l.auto_approved && <> · automático</>}
                </div>
              </div>
              <div>
                {dl < 0
                  ? <span className="badge overdue">Atrasado {Math.abs(dl)}d</span>
                  : dl <= 3
                    ? <span className="badge pending">{dl}d restantes</span>
                    : <span className="badge approved">{dl}d restantes</span>}
              </div>
            </div>
          );
        })}
      </div>

      {approving && (
        <ApprovalModal
          loan={approving}
          onClose={() => setApproving(null)}
          onDone={() => { setApproving(null); load(); }}
        />
      )}
    </div>
  );
}

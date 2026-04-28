import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function fmt(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const typeLabels = {
  loan_request: 'Solicitação',
  loan_auto: 'Empréstimo',
  waitlist_join: 'Fila',
  waitlist_turn: 'Vez na fila',
  due_soon_with_queue: 'Vence em breve',
  overdue_with_queue: 'Atrasado',
  self_return: 'Devolução'
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [unread, setUnread] = useState(0);
  const popRef = useRef(null);
  const nav = useNavigate();

  async function load() {
    try {
      const r = await api.get('/notifications');
      setList(r.list); setUnread(r.unread);
    } catch {}
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e) { if (popRef.current && !popRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function markAll() {
    await api.post('/notifications/read-all', {});
    load();
  }

  async function openNotif(n) {
    if (!n.read) await api.post(`/notifications/${n.id}/read`, {});
    setOpen(false);
    if (n.type === 'loan_request' || n.type === 'loan_auto') nav('/admin/emprestimos');
    else if (n.type === 'waitlist_join' || n.type === 'waitlist_turn') nav('/admin/fila');
    else if (n.loan_id) nav('/admin/emprestimos');
    load();
  }

  return (
    <div ref={popRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} title="Notificações"
        style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)',
          color: 'var(--text-secondary)', cursor: 'pointer',
          display: 'grid', placeItems: 'center', position: 'relative'
        }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 18, height: 18, padding: '0 5px',
            borderRadius: 10, background: '#ff453a',
            color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'grid', placeItems: 'center',
            border: '2px solid var(--bg-base)'
          }}>{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="glass glass-strong" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 380, maxHeight: 500, overflow: 'auto',
          padding: 14, borderRadius: 16, zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="subtitle" style={{ margin: 0 }}>Notificações</div>
            {unread > 0 && <button className="btn sm ghost" onClick={markAll}>marcar lidas</button>}
          </div>

          {list.length === 0 && <div className="empty-state" style={{ padding: 20 }}>Sem notificações.</div>}

          {list.map(n => (
            <div key={n.id} onClick={() => openNotif(n)} style={{
              padding: '10px 12px', marginBottom: 6,
              borderRadius: 10, cursor: 'pointer',
              background: n.read ? 'transparent' : 'rgba(109, 113, 240, 0.08)',
              border: `1px solid ${n.read ? 'var(--border)' : 'rgba(109, 113, 240, 0.25)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 100,
                  background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)',
                  fontSize: 10, fontWeight: 600
                }}>{typeLabels[n.type] || n.type}</span>
                {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {n.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>{fmt(n.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

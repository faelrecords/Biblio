import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import ApprovalModal from '../components/ApprovalModal';

function daysLeft(dueAt) {
  if (!dueAt) return null;
  return Math.ceil((new Date(dueAt) - new Date()) / 86400000);
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export default function AdminLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [approving, setApproving] = useState(null);
  const dateRef = useRef(null);

  async function load() {
    const data = await api.get('/loans');
    setLoans(data); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    function onClick(e) {
      if (dateRef.current && !dateRef.current.contains(e.target)) setShowDate(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function reject(id) { await api.post(`/loans/${id}/reject`, {}); load(); }
  async function ret(id) { await api.post(`/loans/${id}/return`, {}); load(); }

  function applyDate() { setAppliedStart(dateStart); setAppliedEnd(dateEnd); setShowDate(false); }
  function clearDate() { setDateStart(''); setDateEnd(''); setAppliedStart(''); setAppliedEnd(''); setShowDate(false); }

  if (loading) return <div className="container"><div className="spinner" /></div>;

  const filtered = loans.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false;
    if (appliedStart && new Date(l.requested_at) < new Date(appliedStart + 'T00:00:00')) return false;
    if (appliedEnd && new Date(l.requested_at) > new Date(appliedEnd + 'T23:59:59')) return false;
    return true;
  });

  const hasDateFilter = appliedStart || appliedEnd;

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <div className="subtitle">Histórico</div>
          <h1>Empréstimos</h1>
        </div>
        <div className="date-filter-wrap" ref={dateRef}>
          <button
            className={`icon-btn ${hasDateFilter ? 'active' : ''}`}
            onClick={() => setShowDate(v => !v)}
            title="Filtrar por data">
            <CalendarIcon />
          </button>
          {hasDateFilter && (
            <span className="filter-indicator">
              {appliedStart ? fmtDate(appliedStart) : '...'} – {appliedEnd ? fmtDate(appliedEnd) : '...'}
              <button onClick={clearDate} title="Limpar">×</button>
            </span>
          )}

          {showDate && (
            <div className="date-popover glass glass-strong">
              <div className="subtitle" style={{ marginBottom: 8 }}>Filtrar por data de solicitação</div>
              <div className="date-grid">
                <div>
                  <label>Data inicial</label>
                  <input type="date" className="input" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                </div>
                <div>
                  <label>Data final</label>
                  <input type="date" className="input" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
                </div>
              </div>
              <div className="date-actions">
                <button className="btn sm ghost" onClick={clearDate}>Limpar</button>
                <button className="btn sm accent" onClick={applyDate}>Aplicar</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="admin-tabs">
        {[
          ['all', 'Todos'], ['pending', 'Pendentes'], ['approved', 'Ativos'],
          ['returned', 'Devolvidos'], ['rejected', 'Negados']
        ].map(([k, l]) => (
          <button key={k} className={`admin-tab ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>
            {l} ({k === 'all' ? loans.length : loans.filter(x => x.status === k).length})
          </button>
        ))}
      </div>

      <div className="glass list-card">
        {filtered.length === 0 && <div className="empty-state">Nenhum registro no filtro selecionado.</div>}
        {filtered.map(l => {
          const dl = l.status === 'approved' ? daysLeft(l.due_at) : null;
          return (
            <div key={l.id} className="list-row">
              <div className="list-cover">
                <img src={l.cover_url || `https://placehold.co/88x132/1a1a1b/706f70?text=?`} alt="" />
              </div>
              <div>
                <div className="list-main-title">{l.book_title}</div>
                <div className="list-main-sub">
                  {l.user_name} · solicitado {fmtDate(l.requested_at)}
                  {l.status === 'approved' && l.due_at && ` · devolver até ${fmtDate(l.due_at)}`}
                  {l.status === 'returned' && ` · devolvido ${fmtDate(l.returned_at)}`}
                </div>
                {(l.approver_name || l.returner_name) && (
                  <div className="list-main-sub" style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>
                    {l.approver_name && <>aprovado por <strong style={{ color: 'var(--text-secondary)' }}>{l.approver_name}</strong></>}
                    {l.approver_name && l.returner_name && ' · '}
                    {l.returner_name && <>devolvido por <strong style={{ color: 'var(--text-secondary)' }}>{l.returner_name}</strong></>}
                  </div>
                )}
                <div style={{ marginTop: 6 }}>
                  {l.status === 'pending' && <span className="badge pending">em análise</span>}
                  {l.status === 'approved' && (
                    dl < 0
                      ? <span className="badge overdue">atrasado {Math.abs(dl)}d</span>
                      : <span className="badge approved">{dl}d restantes</span>
                  )}
                  {l.status === 'returned' && <span className="badge returned">devolvido</span>}
                  {l.status === 'rejected' && <span className="badge rejected">negado</span>}
                </div>
              </div>
              <div className="actions">
                {l.status === 'pending' && (
                  <>
                    <button className="btn sm success" onClick={() => setApproving(l)}>Aprovar</button>
                    <button className="btn sm danger" onClick={() => reject(l.id)}>Negar</button>
                  </>
                )}
                {l.status === 'approved' && (
                  <button className="btn sm success" onClick={() => ret(l.id)}>Devolver</button>
                )}
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

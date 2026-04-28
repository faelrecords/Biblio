import { useState } from 'react';
import { api } from '../api';

const PRESETS = [7, 14, 21, 30];

export default function ApprovalModal({ loan, book, selfApprove, currentUser, users, onClose, onDone }) {
  const [days, setDays] = useState(14);
  const [targetUserId, setTargetUserId] = useState(currentUser?.id || '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const isSelf = !!selfApprove;
  const title = isSelf ? book?.title : loan?.book_title;
  const targetName = isSelf
    ? (users?.find(u => u.id === Number(targetUserId))?.name || currentUser?.name)
    : loan?.user_name;

  async function confirm() {
    setLoading(true); setErr('');
    try {
      if (isSelf) {
        await api.post('/loans/self-approve', {
          book_id: book.id,
          user_id: Number(targetUserId) || currentUser?.id,
          days
        });
      } else {
        await api.post(`/loans/${loan.id}/approve`, { days });
      }
      onDone();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  const dueDate = new Date(Date.now() + days * 86400000).toLocaleDateString('pt-BR');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal small glass glass-strong" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="subtitle" style={{ textAlign: 'center' }}>
          {isSelf ? 'Auto-empréstimo' : 'Aprovar empréstimo'}
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: 4 }}>{title}</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 22, fontSize: 13 }}>
          para {targetName}
        </p>

        {err && <div className="error-msg">{err}</div>}

        {isSelf && users && users.length > 1 && (
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Emprestar para</label>
            <select className="input" value={targetUserId} onChange={e => setTargetUserId(e.target.value)}>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}{u.id === currentUser?.id ? ' (você)' : ''}{u.is_admin ? ' · admin' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <label style={{ textAlign: 'center', display: 'block', marginBottom: 10 }}>Prazo em dias</label>

        <div className="days-stepper">
          <button onClick={() => setDays(d => Math.max(1, d - 1))} disabled={days <= 1}>−</button>
          <div>
            <span className="value">{days}</span>
            <span className="unit">{days === 1 ? 'dia' : 'dias'}</span>
          </div>
          <button onClick={() => setDays(d => Math.min(90, d + 1))} disabled={days >= 90}>+</button>
        </div>

        <div className="days-presets">
          {PRESETS.map(p => (
            <button key={p} className={`days-preset ${days === p ? 'active' : ''}`} onClick={() => setDays(p)}>
              {p} dias
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12, marginTop: 18 }}>
          Devolução prevista: <strong style={{ color: 'var(--text-secondary)' }}>{dueDate}</strong>
        </p>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn accent" onClick={confirm} disabled={loading}>
            {loading ? 'Processando...' : (isSelf ? 'Confirmar empréstimo' : 'Confirmar aprovação')}
          </button>
        </div>
      </div>
    </div>
  );
}

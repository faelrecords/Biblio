import { useEffect, useState } from 'react';
import { api } from '../api';

function currentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function AdminReads() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('month'); // 'month' | 'all' | 'range'
  const [month, setMonth] = useState(currentYM());
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (mode === 'month' && month) {
      params.set('start', month);
      params.set('end', month);
    } else if (mode === 'range') {
      if (start) params.set('start', start);
      if (end) params.set('end', end);
    }
    const data = await api.get(`/stats/reads?${params.toString()}`);
    setList(data); setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [mode, month, start, end]);

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

          <div className="glass list-card">
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
        </>
      )}
    </div>
  );
}

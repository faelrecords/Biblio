import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

export default function BookSearchModal({ initialQuery = '', onPick, onClose }) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { if (initialQuery) doSearch(initialQuery); /* eslint-disable-next-line */ }, []);

  async function doSearch(query) {
    const text = (query ?? q).trim();
    if (text.length < 2) { setErr('digite ao menos 2 letras'); return; }
    setErr(''); setLoading(true); setResults([]); setSelected(null);
    try {
      const r = await api.get(`/books/search-external?q=${encodeURIComponent(text)}`);
      if (!r.length) setErr('nada encontrado, tente outras palavras');
      setResults(r);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  function pick() {
    if (!selected) return;
    const { source, year, ...rest } = selected;
    onPick(rest);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal glass glass-strong" onClick={e => e.stopPropagation()}
           style={{ maxWidth: 920, width: '100%' }}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="subtitle">Catálogo externo</div>
        <h2 style={{ marginBottom: 14 }}>Buscar livro online</h2>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            ref={inputRef}
            className="input"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), doSearch())}
            placeholder="Título, autor, ISBN..."
            style={{ flex: 1 }}
          />
          <button className="btn accent" onClick={() => doSearch()} disabled={loading}>
            {loading ? '...' : 'Buscar'}
          </button>
        </div>

        {err && <div className="hint" style={{ color: 'var(--danger)' }}>{err}</div>}

        {loading && <div className="spinner" />}

        {!loading && results.length > 0 && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 12,
              maxHeight: 420,
              overflowY: 'auto',
              padding: '4px 2px'
            }}>
              {results.map((r, i) => {
                const isSel = selected === r;
                return (
                  <div key={i} onClick={() => setSelected(r)} style={{
                    cursor: 'pointer',
                    borderRadius: 10,
                    border: isSel ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: isSel ? 'rgba(109,113,240,0.08)' : 'rgba(255,255,255,0.02)',
                    overflow: 'hidden',
                    transition: 'transform 0.15s, border 0.15s',
                    transform: isSel ? 'translateY(-2px)' : 'none',
                    boxShadow: isSel ? '0 8px 24px rgba(109,113,240,0.2)' : 'none'
                  }}>
                    <div style={{
                      width: '100%', aspectRatio: '2/3',
                      background: 'rgba(255,255,255,0.04)',
                      display: 'grid', placeItems: 'center', overflow: 'hidden'
                    }}>
                      {r.cover_url
                        ? <img src={r.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                               onError={e => { e.target.style.display = 'none'; }} />
                        : <div style={{ color: 'var(--text-tertiary)', fontSize: 11, padding: 10, textAlign: 'center' }}>sem capa</div>}
                    </div>
                    <div style={{ padding: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.author || '—'}{r.year ? ` · ${r.year}` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selected && (
              <div style={{
                marginTop: 14, padding: 14, borderRadius: 12,
                background: 'rgba(109,113,240,0.05)', border: '1px solid rgba(109,113,240,0.18)'
              }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {selected.cover_url && (
                    <img src={selected.cover_url} alt="" style={{
                      width: 70, height: 105, objectFit: 'cover', borderRadius: 6,
                      border: '1px solid var(--border)', flexShrink: 0
                    }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{selected.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      {selected.author}{selected.year ? ` · ${selected.year}` : ''}
                      {selected.category && <> · {selected.category}</>}
                    </div>
                    {selected.synopsis && (
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5,
                                    maxHeight: 80, overflow: 'auto' }}>
                        {selected.synopsis}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn accent" disabled={!selected} onClick={pick}>
            Usar este livro
          </button>
        </div>
      </div>
    </div>
  );
}

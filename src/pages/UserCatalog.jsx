import { useEffect, useState } from 'react';
import { api } from '../api';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function UserCatalog() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [topReaders, setTopReaders] = useState([]);

  async function load() {
    try {
      const [data, top] = await Promise.all([
        api.get('/books'),
        api.get('/stats/top-readers').catch(() => [])
      ]);
      setBooks(data);
      setTopReaders(top || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const byCategory = books.reduce((acc, b) => {
    const k = b.category || 'Geral';
    (acc[k] = acc[k] || []).push(b);
    return acc;
  }, {});

  if (loading) return <div className="container"><div className="spinner" /></div>;

  return (
    <div className="container">
      <div className="subtitle">Acervo</div>
      <h1>Encontre seu próximo livro</h1>
      <p className="hero-sub">Navegue pelas categorias e solicite empréstimo com seu código pessoal.</p>

      {topReaders.length > 0 && (
        <div className="glass list-card" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 14 }}>🏆 Top leitores do mês</h2>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            {topReaders.map((r, i) => {
              const medal = ['🥇', '🥈', '🥉'][i] || '';
              return (
                <div key={r.user_id} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: 16, minWidth: 130, borderRadius: 14,
                  background: i === 0 ? 'linear-gradient(135deg, rgba(245,194,91,0.15), rgba(255,255,255,0.04))'
                            : 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)'
                }}>
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt={r.user_name} style={{
                      width: 64, height: 64, borderRadius: '50%',
                      objectFit: 'cover', border: '2px solid var(--accent)',
                      marginBottom: 8
                    }} />
                  ) : (
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent), #8a8ef5)',
                      display: 'grid', placeItems: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 22, marginBottom: 8
                    }}>{r.user_name.charAt(0).toUpperCase()}</div>
                  )}
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{medal}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{r.user_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {r.count} {r.count === 1 ? 'livro' : 'livros'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {Object.keys(byCategory).length === 0 && (
        <div className="glass list-card"><div className="empty-state">Nenhum livro cadastrado ainda.</div></div>
      )}

      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat} className="row">
          <div className="row-header">
            <span className="row-title">{cat}</span>
            <span className="row-count">{items.length} títulos</span>
          </div>
          <div className="row-scroll">
            {items.map(b => (
              <BookCard key={b.id} book={b} onClick={() => setSelected(b)} />
            ))}
          </div>
        </div>
      ))}

      {selected && <BookModal book={selected} onClose={() => setSelected(null)} onUpdate={load} />}
    </div>
  );
}

function BookCard({ book, onClick }) {
  const cls = book.status === 'borrowed' ? 'unavailable' : book.status === 'pending' ? 'pending-status' : '';
  return (
    <div className={`book-card ${cls}`} onClick={onClick}>
      <div className="book-cover" style={{ position: 'relative' }}>
        <img src={book.cover_url || `https://placehold.co/300x450/1a1a1b/706f70?text=${encodeURIComponent(book.title)}`}
             alt={book.title}
             style={book.status !== 'available' ? { filter: 'grayscale(100%) brightness(0.6)' } : {}}
             onError={e => { e.target.src = `https://placehold.co/300x450/1a1a1b/706f70?text=${encodeURIComponent(book.title)}`; }} />
        {book.status === 'pending' && (
          <span className="card-badge" style={{ color: 'var(--warning)' }}>Em análise</span>
        )}
        {book.status === 'borrowed' && (
          <span className="card-badge" style={{ color: 'var(--text-secondary)' }}>Emprestado</span>
        )}
        {book.waitlist_count > 0 && (
          <span className="card-badge" style={{
            top: 'auto', bottom: 10, color: 'var(--accent-text)'
          }}>{book.waitlist_count} na fila</span>
        )}
      </div>
      <div className="book-title">{book.title}</div>
      <div className="book-author">{book.author}</div>
    </div>
  );
}

function BookModal({ book, onClose, onUpdate }) {
  const [step, setStep] = useState('detail'); // detail | code-request | code-waitlist | code-renew | success-request | success-waitlist | success-renew
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({});

  async function request() {
    setErr(''); setLoading(true);
    try {
      const r = await api.post('/loans/request', { book_id: book.id, code });
      setResult(r);
      setStep('success-request');
      onUpdate();
    } catch (e) {
      // detecta erro especial de hold expirado
      if (e.message === 'tempo_expirado') {
        setStep('expired-hold');
        setErr('');
      } else {
        setErr(e.message);
      }
    }
    finally { setLoading(false); }
  }

  async function joinWaitlist() {
    setErr(''); setLoading(true);
    try {
      const r = await api.post('/waitlist/join', { book_id: book.id, code });
      setResult(r);
      setStep('success-waitlist');
      onUpdate();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function renew() {
    setErr(''); setLoading(true);
    try {
      const r = await api.post('/loans/renew-by-book', { book_id: book.id, code });
      setResult(r);
      setStep('success-renew');
      onUpdate();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function returnBook() {
    setErr(''); setLoading(true);
    try {
      const r = await api.post('/loans/return-by-book', { book_id: book.id, code });
      setResult(r);
      setStep('success-return');
      onUpdate();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal glass glass-strong" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        {step === 'detail' && (
          <div className="book-detail-layout">
            <div className="book-detail-cover">
              <img src={book.cover_url || `https://placehold.co/300x450/1a1a1b/706f70?text=${encodeURIComponent(book.title)}`}
                   alt={book.title}
                   style={{ filter: book.status !== 'available' ? 'grayscale(100%) brightness(0.6)' : 'none' }} />
            </div>
            <div>
              <h2 className="book-detail-title">{book.title}</h2>
              <div className="book-detail-author">{book.author}</div>
              <span className="book-detail-cat">{book.category}</span>
              <p className="book-detail-synopsis">{book.synopsis || 'Sem sinopse disponível.'}</p>

              <div style={{ marginBottom: 12 }}>
                {book.status === 'available' && <span className="badge approved">Disponível · {book.default_days || 14} dias</span>}
                {book.status === 'pending' && <span className="badge pending">Em análise</span>}
                {book.status === 'borrowed' && (
                  <>
                    <span className="badge approved">Emprestado</span>
                    {book.due_at && <span className="hint" style={{ display: 'inline-block', marginLeft: 8 }}>devolução prevista {fmtDate(book.due_at)}</span>}
                  </>
                )}
                {book.waitlist_count > 0 && <span className="badge pending" style={{ marginLeft: 8 }}>{book.waitlist_count} na fila</span>}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {book.status === 'available' && (
                  <button className="btn accent" onClick={() => { setStep('code-request'); setCode(''); setErr(''); }}>
                    Solicitar empréstimo
                  </button>
                )}
                {book.status === 'borrowed' && (
                  <>
                    <button className="btn accent" onClick={() => { setStep('code-waitlist'); setCode(''); setErr(''); }}>
                      Entrar na fila
                    </button>
                    <button className="btn ghost" onClick={() => { setStep('code-renew'); setCode(''); setErr(''); }}>
                      Renovar
                    </button>
                    <button className="btn ghost" onClick={() => { setStep('code-return'); setCode(''); setErr(''); }}>
                      Devolver
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {step.startsWith('code-') && (
          <div>
            <div className="subtitle">
              {step === 'code-request' && 'Confirmar solicitação'}
              {step === 'code-waitlist' && 'Entrar na fila de espera'}
              {step === 'code-renew' && 'Renovar empréstimo'}
              {step === 'code-return' && 'Devolver livro'}
            </div>
            <h2 style={{ marginBottom: 8 }}>Digite seu código</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13 }}>
              {step === 'code-request' && <>Use seu código para solicitar <strong>{book.title}</strong>.</>}
              {step === 'code-waitlist' && <>Você será avisado quando o livro voltar.</>}
              {step === 'code-renew' && <>A renovação adiciona um novo período. Se houver fila, não é permitido.</>}
              {step === 'code-return' && <>Confirma que você está devolvendo <strong>{book.title}</strong>?</>}
            </p>
            {err && <div className="error-msg">{err}</div>}
            <div className="field">
              <label>Código de acesso</label>
              <input className="input" autoFocus value={code}
                     onChange={e => setCode(e.target.value.toUpperCase())}
                     onKeyDown={e => {
                       if (e.key !== 'Enter' || !code) return;
                       if (step === 'code-request') request();
                       else if (step === 'code-waitlist') joinWaitlist();
                       else if (step === 'code-renew') renew();
                       else if (step === 'code-return') returnBook();
                     }}
                     placeholder="Ex: 123" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn ghost" onClick={() => setStep('detail')}>Voltar</button>
              <button className="btn accent" disabled={loading || !code}
                      onClick={() => {
                        if (step === 'code-request') request();
                        else if (step === 'code-waitlist') joinWaitlist();
                        else if (step === 'code-renew') renew();
                        else if (step === 'code-return') returnBook();
                      }}>
                {loading ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}

        {step === 'expired-hold' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12, color: 'var(--warning)' }}>⏱</div>
            <h2 style={{ marginBottom: 10 }}>Tempo expirado</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13 }}>
              Você perdeu o tempo para retirada. Deseja entrar novamente na fila?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn ghost" onClick={onClose}>Não, fechar</button>
              <button className="btn accent" onClick={joinWaitlist} disabled={loading}>
                {loading ? 'Enviando...' : 'Sim, entrar na fila'}
              </button>
            </div>
          </div>
        )}

        {step === 'success-request' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12, color: 'var(--accent-text)' }}>✓</div>
            {result.auto_approved ? (
              <>
                <h2 style={{ marginBottom: 10 }}>Livro reservado</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 8, fontSize: 13 }}>
                  {result.user_name}, <strong>{result.book_title}</strong> está reservado por você por <strong>{result.days} dias</strong>.
                </p>
                <p style={{ color: 'var(--text-tertiary)', marginBottom: 24, fontSize: 12 }}>
                  Devolução prevista: {fmtDate(result.due_at)}<br />
                  Não se esqueça de devolver ou renovar antes do término da data.
                </p>
              </>
            ) : (
              <>
                <h2 style={{ marginBottom: 10 }}>Solicitação enviada</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 13 }}>
                  {result.user_name}, aguarde a aprovação do administrador para retirar o livro.
                </p>
              </>
            )}
            <button className="btn accent" onClick={onClose}>Fechar</button>
          </div>
        )}

        {step === 'success-waitlist' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12, color: 'var(--accent-text)' }}>📋</div>
            <h2 style={{ marginBottom: 10 }}>Você está na fila</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 8, fontSize: 13 }}>
              {result.user_name}, sua posição é <strong>#{result.position}</strong> para <strong>{result.book_title}</strong>.
            </p>
            <button className="btn accent" onClick={onClose}>Fechar</button>
          </div>
        )}

        {step === 'success-renew' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12, color: 'var(--accent-text)' }}>↻</div>
            <h2 style={{ marginBottom: 10 }}>Empréstimo renovado</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 8, fontSize: 13 }}>
              Nova devolução prevista: <strong>{fmtDate(result.due_at)}</strong>
            </p>
            {result.renewed_count && (
              <p style={{ color: 'var(--text-tertiary)', marginBottom: 16, fontSize: 12 }}>
                Renovação nº {result.renewed_count}
              </p>
            )}
            <button className="btn accent" onClick={onClose}>Fechar</button>
          </div>
        )}

        {step === 'success-return' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12, color: 'var(--success)' }}>✓</div>
            <h2 style={{ marginBottom: 10 }}>Devolução registrada</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 13 }}>
              Obrigado pela devolução. O administrador foi notificado para conferir.
            </p>
            <button className="btn accent" onClick={onClose}>Fechar</button>
          </div>
        )}
      </div>
    </div>
  );
}

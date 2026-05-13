import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setSession } from '../api';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [superSession, setSuperSession] = useState(null);
  const nav = useNavigate();

  function enterAs(path) {
    if (!superSession) return;
    setSession(superSession.token, superSession.user);
    nav(path);
  }

  async function submit(e) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const r = await api.post('/auth/admin', { identifier, password: pass });
      if (r.user?.is_super) {
        setSuperSession(r);
      } else {
        setSession(r.token, r.user);
        nav('/admin');
      }
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card glass glass-strong">
        <div className="subtitle" style={{ textAlign: 'center' }}>Área restrita</div>
        <h1 className="auth-title">Acesso administrativo</h1>
        <p className="auth-sub">Entre com seu nome ou código</p>

        {err && <div className="error-msg">{err}</div>}

        {superSession ? (
          <div>
            <div className="success-msg">Escolha modo de entrada.</div>
            <button className="btn accent block" onClick={() => enterAs('/admin')} style={{ marginTop: 12, padding: '12px' }}>
              Entrar como admin
            </button>
            <button className="btn ghost block" onClick={() => enterAs('/catalogo')} style={{ marginTop: 10, padding: '12px' }}>
              Entrar como leitor
            </button>
          </div>
        ) : (
        <form onSubmit={submit}>
          <div className="field">
            <label>Nome ou código</label>
            <input className="input" value={identifier}
                   onChange={e => setIdentifier(e.target.value)}
                   autoFocus placeholder="Usuário ou ID" />
          </div>
          <div className="field">
            <label>Senha</label>
            <input className="input" type="password" value={pass} onChange={e => setPass(e.target.value)} />
          </div>
          <button className="btn accent block" disabled={loading} style={{ marginTop: 20, padding: '12px' }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        )}

        <div className="auth-back">
          <Link to="/">← voltar</Link>
        </div>
      </div>
    </div>
  );
}

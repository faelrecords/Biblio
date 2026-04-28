import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setSession } from '../api';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const r = await api.post('/auth/admin', { identifier, password: pass });
      setSession(r.token, r.user);
      nav('/admin');
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

        <div className="auth-back">
          <Link to="/">← voltar</Link>
        </div>
      </div>
    </div>
  );
}

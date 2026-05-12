import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api, setSession } from '../api';

export default function Landing({ onSecretTitleClick }) {
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function login(event) {
    event.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const result = await api.post('/auth/user', {
        identifier: identifier.trim(),
        password
      });
      setSession(result.token, result.user);
      if (result.user?.force_password_change) nav('/primeiro-acesso');
      else if (result.user?.is_admin) nav('/admin');
      else nav('/catalogo');
    } catch (error) {
      if (/usuário não existe/i.test(error.message)) {
        setErr('Usuário não existe. Solicite seu cadastro ao administrador.');
      } else {
        setErr(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landing-wrap">
      <div className="landing-card glass glass-strong">
        <h1 className="landing-logo" onClick={onSecretTitleClick}>Biblio</h1>
        <p className="landing-subtitle">desenvolvido por @fael.records</p>

        <form onSubmit={login}>
          {err && <div className="error-msg">{err}</div>}
          <div className="field">
            <label>Nome ou código</label>
            <input
              className="input"
              value={identifier}
              onChange={event => setIdentifier(event.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label>Senha</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="landing-actions">
            <button className="btn accent block" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, getProfile, setSession } from '../api';

export default function CompleteSetup() {
  const nav = useNavigate();
  const profile = getProfile();
  const [accessCode, setAccessCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  if (!profile) return <Navigate to="/" replace />;
  if (!profile.force_password_change) return <Navigate to="/catalogo" replace />;

  async function submit(event) {
    event.preventDefault();
    setErr('');
    if (password !== confirm) {
      setErr('senhas não conferem');
      return;
    }
    setLoading(true);
    try {
      const result = await api.post('/me/complete-setup', {
        access_code: accessCode,
        password
      });
      setSession(result.token, result.user);
      nav('/catalogo');
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landing-wrap">
      <div className="landing-card glass glass-strong">
        <h1 className="landing-logo">Biblio</h1>
        <p className="landing-subtitle">primeiro acesso</p>
        <form onSubmit={submit}>
          {err && <div className="error-msg">{err}</div>}
          <div className="field">
            <label>Código do mercadinho</label>
            <input
              className="input"
              value={accessCode}
              onChange={event => setAccessCode(event.target.value.toUpperCase())}
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label>Nova senha</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={4}
              required
            />
          </div>
          <div className="field">
            <label>Confirmar senha</label>
            <input
              className="input"
              type="password"
              value={confirm}
              onChange={event => setConfirm(event.target.value)}
              autoComplete="new-password"
              minLength={4}
              required
            />
          </div>
          <button className="btn accent block" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>
    </div>
  );
}

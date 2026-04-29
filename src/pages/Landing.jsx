import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api, setSession } from '../api';

const emptyRegister = {
  name: '',
  access_code: '',
  password: '',
  email: ''
};

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('falha ao ler imagem'));
    reader.readAsDataURL(file);
  });
}

export default function Landing({ onSecretTitleClick }) {
  const nav = useNavigate();
  const [mode, setMode] = useState('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(emptyRegister);
  const [avatarFile, setAvatarFile] = useState(null);
  const [promptMissing, setPromptMissing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  function startRegister(code = '') {
    setMode('register');
    setPromptMissing(false);
    setErr('');
    setRegister(current => ({
      ...current,
      access_code: code || current.access_code
    }));
  }

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
      nav('/catalogo');
    } catch (error) {
      if (/usuário não existe/i.test(error.message) && identifier.trim()) {
        setRegister(current => ({
          ...current,
          access_code: identifier.trim().toUpperCase()
        }));
        setPromptMissing(true);
      } else {
        setErr(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function createAccount(event) {
    event.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const result = await api.post('/auth/register', register);
      setSession(result.token, result.user);
      if (avatarFile) {
        const data = await toDataUrl(avatarFile);
        const avatar = await api.post('/me/avatar', { data });
        setSession(result.token, avatar.user || { ...result.user, avatar_url: avatar.url });
      }
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
        <h1 className="landing-logo" onClick={onSecretTitleClick}>Biblio</h1>
        <p className="landing-subtitle">desenvolvido por @fael.records</p>

        {mode === 'login' ? (
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
              <button type="button" className="btn ghost block" onClick={() => startRegister()}>
                Criar cadastro
              </button>
              <Link to="/semlogin" className="btn ghost block">
                Acessar sem login
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={createAccount}>
            {err && <div className="error-msg">{err}</div>}
            <div className="field">
              <label>Nome</label>
              <input
                className="input"
                value={register.name}
                onChange={event => setRegister({ ...register, name: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Código desejado</label>
              <input
                className="input"
                value={register.access_code}
                onChange={event => setRegister({ ...register, access_code: event.target.value.toUpperCase() })}
                required
              />
            </div>
            <div className="field">
              <label>Senha de login</label>
              <input
                className="input"
                type="password"
                value={register.password}
                onChange={event => setRegister({ ...register, password: event.target.value })}
                autoComplete="new-password"
                minLength={4}
                required
              />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input
                className="input"
                type="email"
                value={register.email}
                onChange={event => setRegister({ ...register, email: event.target.value })}
              />
            </div>
            <div className="field">
              <label>Foto de perfil</label>
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={event => setAvatarFile(event.target.files?.[0] || null)}
              />
            </div>
            <div className="landing-actions">
              <button className="btn accent block" disabled={loading}>
                {loading ? 'Criando...' : 'Cadastrar'}
              </button>
              <button type="button" className="btn ghost block" onClick={() => setMode('login')}>
                Voltar ao login
              </button>
            </div>
          </form>
        )}

        <div className="auth-back">
          <Link to="/admin-login">Administrador</Link>
        </div>
      </div>

      {promptMissing && (
        <div className="modal-backdrop">
          <div className="modal small glass glass-strong" style={{ textAlign: 'center' }}>
            <h2 style={{ marginBottom: 12 }}>Usuário não existe</h2>
            <p className="hint" style={{ marginBottom: 18 }}>
              Usuário não existe deseja iniciar um novo cadastro com esse código?
            </p>
            <div className="landing-actions">
              <button className="btn accent block" onClick={() => startRegister(identifier.trim().toUpperCase())}>
                Sim
              </button>
              <button className="btn ghost block" onClick={() => setPromptMissing(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

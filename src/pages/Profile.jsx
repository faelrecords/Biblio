import { useEffect, useRef, useState } from 'react';
import { api, getToken, setSession } from '../api';

const emptyProfile = {
  name: '', email: '', phone: '', department: '', job_title: '', bio: '', avatar_url: '',
  is_admin: false, is_super: false, audit_log_enabled: true
};

export default function Profile() {
  const fileRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get('/me/profile').then(data => setProfile({ ...emptyProfile, ...data })).catch(err => setError(err.message));
  }, []);

  function persistUser(user) {
    const next = { ...emptyProfile, ...user };
    setProfile(next);
    setSession(getToken(), next);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true); setMessage(''); setError('');
    try {
      const user = await api.put('/me/profile', profile);
      persistUser(user);
      setMessage('Perfil atualizado.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Selecione uma imagem.'); return; }
    if (file.size > 3 * 1024 * 1024) { setError('A foto deve ter no máximo 3 MB.'); return; }
    setUploading(true); setMessage(''); setError('');
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
        reader.readAsDataURL(file);
      });
      const result = await api.post('/me/avatar', { data });
      persistUser(result.user);
      setMessage('Foto atualizada.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setMessage(''); setError('');
    if (password.next !== password.confirm) { setError('A confirmação da senha não confere.'); return; }
    setSaving(true);
    try {
      await api.put('/me/password', { current_password: password.current, new_password: password.next });
      setPassword({ current: '', next: '', confirm: '' });
      setMessage('Senha alterada.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleAuditLog(enabled) {
    setMessage(''); setError('');
    try {
      const user = await api.put('/me/audit-log', { enabled });
      persistUser(user);
      setMessage(enabled ? 'Seu registro no Log foi ativado.' : 'Seu registro no Log foi desativado.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!profile && !error) return <div className="container"><div className="spinner" /></div>;
  if (!profile) return <div className="container"><div className="error-msg">{error}</div></div>;

  return (
    <div className="container">
      <div className="subtitle">Conta</div>
      <h1 style={{ marginBottom: 24 }}>Perfil</h1>
      {message && <div className="success-msg">{message}</div>}
      {error && <div className="error-msg">{error}</div>}

      <div className="profile-grid">
        <form className="glass list-card" onSubmit={saveProfile}>
          <h2 style={{ marginBottom: 18 }}>Seus dados</h2>
          <div className="profile-avatar-area">
            {profile.avatar_url
              ? <img className="profile-avatar" src={profile.avatar_url} alt="Foto do perfil" />
              : <div className="profile-avatar profile-avatar-fallback">{profile.name.charAt(0).toUpperCase()}</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn sm ghost" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? 'Enviando…' : 'Alterar foto'}
              </button>
              {profile.avatar_url && (
                <button type="button" className="btn sm danger" onClick={() => setProfile(current => ({ ...current, avatar_url: '' }))}>
                  Remover foto
                </button>
              )}
              <input ref={fileRef} hidden type="file" accept="image/*" onChange={uploadAvatar} />
            </div>
          </div>
          <div className="field"><label>Nome</label><input className="input" value={profile.name} disabled /></div>
          <div className="field"><label>E-mail (opcional)</label><input className="input" type="email" value={profile.email} onChange={event => setProfile({ ...profile, email: event.target.value })} /></div>
          <div className="field"><label>Telefone (opcional)</label><input className="input" value={profile.phone} onChange={event => setProfile({ ...profile, phone: event.target.value })} /></div>
          <div className="field"><label>Setor (opcional)</label><input className="input" value={profile.department} onChange={event => setProfile({ ...profile, department: event.target.value })} /></div>
          <div className="field"><label>Cargo (opcional)</label><input className="input" value={profile.job_title} onChange={event => setProfile({ ...profile, job_title: event.target.value })} /></div>
          <div className="field"><label>Sobre você (opcional)</label><textarea className="textarea" maxLength={800} value={profile.bio} onChange={event => setProfile({ ...profile, bio: event.target.value })} /></div>
          <button className="btn accent" disabled={saving}>Salvar perfil</button>
        </form>

        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <form className="glass list-card" onSubmit={changePassword}>
            <h2 style={{ marginBottom: 18 }}>Alterar senha</h2>
            <div className="field"><label>Senha atual</label><input className="input" type="password" autoComplete="current-password" value={password.current} onChange={event => setPassword({ ...password, current: event.target.value })} /></div>
            <div className="field"><label>Nova senha</label><input className="input" type="password" autoComplete="new-password" value={password.next} onChange={event => setPassword({ ...password, next: event.target.value })} /></div>
            <div className="field"><label>Confirmar nova senha</label><input className="input" type="password" autoComplete="new-password" value={password.confirm} onChange={event => setPassword({ ...password, confirm: event.target.value })} /></div>
            <button className="btn accent" disabled={saving || !password.current || password.next.length < 4 || !password.confirm}>Alterar senha</button>
          </form>

          {profile.is_super && (
            <div className="glass list-card">
              <div className="subtitle">Super administrador</div>
              <h2 style={{ marginBottom: 10 }}>Registro no Log</h2>
              <p className="hint" style={{ marginBottom: 16 }}>Administradores normais continuam sempre registrados.</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                <span>{profile.audit_log_enabled ? 'Registrar minhas ações' : 'Não registrar minhas ações'}</span>
                <label className="toggle-switch" title={profile.audit_log_enabled ? 'Desativar registro' : 'Ativar registro'}>
                  <input type="checkbox" checked={profile.audit_log_enabled} onChange={event => toggleAuditLog(event.target.checked)} />
                  <span className="track" />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


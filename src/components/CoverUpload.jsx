import { useRef, useState } from 'react';
import { api } from '../api';

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export default function CoverUpload({ value, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  function pick() { fileRef.current?.click(); }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErr('selecione uma imagem'); return; }
    if (file.size > 10 * 1024 * 1024) { setErr('imagem maior que 10MB'); return; }
    setErr(''); setUploading(true);
    try {
      const data = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => rej(new Error('falha ao ler arquivo'));
        r.readAsDataURL(file);
      });
      const r = await api.post('/upload', { data });
      onChange(r.url);
    } catch (ex) { setErr(ex.message); }
    finally { setUploading(false); }
  }

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="https://... ou use o botão de upload"
          style={{ paddingRight: 48 }}
        />
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          title="Enviar imagem do computador"
          style={{
            position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)',
            width: 34, height: 34, border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)',
            borderRadius: 8, cursor: uploading ? 'wait' : 'pointer',
            display: 'grid', placeItems: 'center', transition: 'all 0.15s'
          }}
        >
          {uploading ? '…' : <UploadIcon />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
      {err && <div style={{ color: 'var(--danger)', fontSize: 11, marginTop: 4 }}>{err}</div>}
      {value && value.startsWith('/api/uploads/') && (
        <div className="hint">imagem salva no servidor</div>
      )}
    </div>
  );
}

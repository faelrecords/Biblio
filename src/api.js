const BASE = import.meta.env.VITE_API_URL || (
  window.location.hostname.endsWith('github.io')
    ? 'https://xpwejczbdwjdvgjmxzsg.supabase.co/functions/v1/api'
    : '/api'
);

export function getToken() { return localStorage.getItem('token'); }

function decodeJwtPayload(token) {
  try {
    const part = token?.split('.')[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function setSession(token, profile) {
  localStorage.setItem('token', token);
  if (profile) localStorage.setItem('profile', JSON.stringify(profile));
}
export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('profile');
}
export function getProfile() {
  const p = localStorage.getItem('profile');
  if (p) {
    try { return JSON.parse(p); } catch { localStorage.removeItem('profile'); }
  }
  const payload = decodeJwtPayload(getToken());
  return payload?.id ? payload : null;
}
export function isUser() {
  const t = getToken();
  if (!t) return false;
  const payload = decodeJwtPayload(t);
  return !!payload && payload.role === 'user' && !payload.is_admin;
}
export function isAdmin() {
  const t = getToken();
  if (!t) return false;
  const payload = decodeJwtPayload(t);
  return !!payload?.is_admin;
}
export function getAuthId() {
  const t = getToken();
  if (!t) return null;
  return decodeJwtPayload(t)?.id || null;
}

async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(BASE + path, { ...opts, headers });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: 'erro' }));
    throw new Error(err.error || 'erro');
  }
  if (r.status === 204) return null;
  return r.json();
}

export const api = {
  get:  (p)    => request(p),
  post: (p, b) => request(p, { method: 'POST', body: JSON.stringify(b) }),
  put:  (p, b) => request(p, { method: 'PUT',  body: JSON.stringify(b) }),
  del:  (p)    => request(p, { method: 'DELETE' })
};

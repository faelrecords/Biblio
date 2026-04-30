const BASE = import.meta.env.VITE_API_URL || 'https://xpwejczbdwjdvgjmxzsg.supabase.co/functions/v1/api';

export function getToken() { return localStorage.getItem('token'); }
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
  return p ? JSON.parse(p) : null;
}
export function isUser() {
  const t = getToken();
  if (!t) return false;
  try {
    const payload = JSON.parse(atob(t.split('.')[1]));
    return payload.role === 'user' && !payload.is_admin;
  } catch { return false; }
}
export function isAdmin() {
  const t = getToken();
  if (!t) return false;
  try {
    const payload = JSON.parse(atob(t.split('.')[1]));
    return !!payload.is_admin;
  } catch { return false; }
}
export function getAuthId() {
  const t = getToken();
  if (!t) return null;
  try {
    return JSON.parse(atob(t.split('.')[1])).id;
  } catch { return null; }
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

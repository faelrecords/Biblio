import { useCallback, useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { isAdmin, getProfile, clearSession } from './api';
import Landing from './pages/Landing';
import Login from './pages/Login';
import UserCatalog from './pages/UserCatalog';
import AdminDashboard from './pages/AdminDashboard';
import AdminBooks from './pages/AdminBooks';
import AdminUsers from './pages/AdminUsers';
import AdminLoans from './pages/AdminLoans';
import AdminWaitlist from './pages/AdminWaitlist';
import AdminReads from './pages/AdminReads';
import NotificationBell from './components/NotificationBell';

const SECRET_THEME_STORAGE_KEY = 'biblio.secretTheme.v1';
const THEME_VARIABLES = [
  '--bg-base',
  '--bg-elevated',
  '--surface',
  '--surface-raised',
  '--text-primary',
  '--text-secondary',
  '--text-tertiary',
  '--text-muted',
  '--accent',
  '--accent-soft',
  '--accent-text',
  '--accent-dim',
  '--accent-strong',
  '--accent-shadow',
  '--accent-shadow-hover',
  '--bg-glow-primary',
  '--bg-glow-secondary',
  '--glass-bg',
  '--glass-bg-strong',
  '--glass-border',
  '--border',
  '--border-strong',
  '--danger',
  '--success',
  '--warning'
];
const THEME_VARIABLE_SET = new Set(THEME_VARIABLES);
const THEME_COLOR_ALIASES = {
  background: '--bg-base',
  surface: '--surface',
  'surface-dim': '--bg-elevated',
  'surface-container': '--glass-bg',
  'surface-container-high': '--glass-bg-strong',
  'surface-container-highest': '--surface-raised',
  'surface-variant': '--border',
  'on-background': '--text-primary',
  'on-surface': '--text-primary',
  'on-surface-variant': '--text-secondary',
  outline: '--text-tertiary',
  'outline-variant': '--border-strong',
  primary: '--accent',
  'primary-container': '--accent-strong',
  'on-primary-container': '--accent-text',
  'inverse-primary': '--accent-soft',
  secondary: '--accent-soft',
  tertiary: '--bg-glow-secondary',
  error: '--danger'
};

function normalizeThemeKey(rawKey) {
  const key = rawKey.trim().replace(/^`|`$/g, '').toLowerCase();
  if (THEME_COLOR_ALIASES[key]) return THEME_COLOR_ALIASES[key];
  const cssKey = key.startsWith('--') ? key : `--${key}`;
  return THEME_VARIABLE_SET.has(cssKey) ? cssKey : null;
}

function isSafeColorValue(rawValue) {
  const value = rawValue.trim().replace(/^`|`$/g, '');
  return /^(#[0-9a-f]{3,8}|rgba?\([0-9\s.,%]+\)|hsla?\([0-9\s.,%]+\)|[a-z]+)$/i.test(value);
}

function parseThemeMarkdown(text) {
  const vars = {};
  let inColors = false;
  let frontmatterOpen = false;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '---') {
      frontmatterOpen = !frontmatterOpen;
      inColors = false;
      continue;
    }
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (frontmatterOpen && trimmed === 'colors:') {
      inColors = true;
      continue;
    }
    if (frontmatterOpen && /^[a-z0-9-]+:\s*$/i.test(trimmed) && trimmed !== 'colors:') {
      inColors = false;
      continue;
    }

    let parts = null;
    if (inColors) {
      const match = trimmed.match(/^([a-z0-9-]+):\s*['"]?(.+?)['"]?\s*$/i);
      if (match) parts = [match[1], match[2]];
    } else if (trimmed.includes('|')) {
      parts = trimmed.split('|').map(part => part.trim()).filter(Boolean);
      if (parts[0]?.replace(/^-+$/, '') === '') continue;
    } else {
      const match = trimmed.match(/^(?:[-*]\s*)?`?(-{0,2}[a-z0-9-]+)`?\s*[:=]\s*`?(.+?)`?\s*$/i);
      if (match) parts = [match[1], match[2]];
    }

    if (!parts || parts.length < 2) continue;
    const key = normalizeThemeKey(parts[0]);
    const value = parts[1].replace(/;$/, '').trim();
    if (key && isSafeColorValue(value)) vars[key] = value;
  }
  return vars;
}

function applyThemeVariables(vars) {
  for (const key of THEME_VARIABLES) document.documentElement.style.removeProperty(key);
  for (const [key, value] of Object.entries(vars)) {
    if (THEME_VARIABLE_SET.has(key)) document.documentElement.style.setProperty(key, value);
  }
}

function SecretPopup({ onClose, onApplyTheme, onResetTheme, themeInfo }) {
  const fileRef = useRef(null);
  const [message, setMessage] = useState(themeInfo ? `Tema atual: ${themeInfo.source}` : 'Tema padrão ativo.');

  async function uploadTheme(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const vars = parseThemeMarkdown(text);
      const count = Object.keys(vars).length;
      if (!count) {
        setMessage('Nenhuma cor válida encontrada.');
        return;
      }
      onApplyTheme(vars, file.name);
      setMessage(`${count} cores aplicadas.`);
    } catch {
      setMessage('Falha ao ler arquivo.');
    } finally {
      event.target.value = '';
    }
  }

  function resetTheme() {
    onResetTheme();
    setMessage('Tema padrão restaurado.');
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal small glass glass-strong" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="subtitle" style={{ textAlign: 'center' }}>Função secreta</div>
        <h2 style={{ marginBottom: 14 }}>Tema secreto</h2>
        <input ref={fileRef} type="file" accept=".md,text/markdown,text/plain" onChange={uploadTheme} style={{ display: 'none' }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn accent" onClick={() => fileRef.current?.click()}>Upload .md</button>
          <button className="btn ghost" onClick={resetTheme}>Padrão</button>
        </div>
        <div className="hint" style={{ marginTop: 14 }}>{message}</div>
      </div>
    </div>
  );
}

function Navbar({ variant, onSecretTitleClick }) {
  const admin = isAdmin();
  const profile = getProfile();
  const nav = useNavigate();
  const loc = useLocation();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  function logout() { clearSession(); nav('/'); }
  function clickSecretTitle(event) {
    event.preventDefault();
    onSecretTitleClick();
  }
  function closeAdminMenu() {
    setAdminMenuOpen(false);
  }
  const brand = (
    <span>Biblio</span>
  );

  if (variant === 'catalog') {
    return (
      <nav className="navbar catalog-navbar glass">
        <Link to="/" className="nav-brand" onClick={clickSecretTitle}>{brand}</Link>
      </nav>
    );
  }

  if (variant === 'admin' && admin) {
    return (
      <nav className="navbar glass">
        <div className="nav-admin-head">
          <button
            type="button"
            className="btn sm ghost nav-menu-toggle"
            onClick={() => setAdminMenuOpen(open => !open)}
            aria-expanded={adminMenuOpen}
          >
            Menu
          </button>
          <Link to="/admin" className="nav-brand" onClick={clickSecretTitle}>{brand}</Link>
          <div className="nav-notifications-mobile">
            <NotificationBell />
          </div>
        </div>
        <div className={`nav-links admin-nav-links ${adminMenuOpen ? 'open' : ''}`}>
          <Link onClick={closeAdminMenu} to="/admin" className={`nav-link ${loc.pathname === '/admin' ? 'active' : ''}`}>Painel</Link>
          <Link onClick={closeAdminMenu} to="/admin/livros" className={`nav-link ${loc.pathname === '/admin/livros' ? 'active' : ''}`}>Livros</Link>
          <Link onClick={closeAdminMenu} to="/admin/usuarios" className={`nav-link ${loc.pathname === '/admin/usuarios' ? 'active' : ''}`}>Usuários</Link>
          <Link onClick={closeAdminMenu} to="/admin/emprestimos" className={`nav-link ${loc.pathname === '/admin/emprestimos' ? 'active' : ''}`}>Empréstimos</Link>
          <Link onClick={closeAdminMenu} to="/admin/fila" className={`nav-link ${loc.pathname === '/admin/fila' ? 'active' : ''}`}>Fila</Link>
          <Link onClick={closeAdminMenu} to="/admin/leituras" className={`nav-link ${loc.pathname === '/admin/leituras' ? 'active' : ''}`}>Leituras</Link>
          <div className="nav-notifications-desktop">
            <NotificationBell />
          </div>
          <span className="nav-user">{profile?.name || profile?.username}</span>
          <button className="btn sm ghost" onClick={logout}>Sair</button>
        </div>
      </nav>
    );
  }

  return null;
}

function AdminGuard({ children }) {
  if (!isAdmin()) return <Navigate to="/admin-login" replace />;
  return children;
}

export default function App() {
  const loc = useLocation();
  const [secretOpen, setSecretOpen] = useState(false);
  const [themeInfo, setThemeInfo] = useState(null);
  const secretClicks = useRef({ count: 0, timer: null });
  const isCatalog = loc.pathname === '/catalogo';
  const isAdminPage = loc.pathname.startsWith('/admin') && loc.pathname !== '/admin-login';

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SECRET_THEME_STORAGE_KEY));
      if (!saved?.vars) return;
      applyThemeVariables(saved.vars);
      setThemeInfo(saved);
    } catch {
      localStorage.removeItem(SECRET_THEME_STORAGE_KEY);
    }
  }, []);

  const handleSecretTitleClick = useCallback(() => {
    const state = secretClicks.current;
    state.count += 1;
    clearTimeout(state.timer);
    state.timer = setTimeout(() => { state.count = 0; }, 1200);

    if (state.count >= 10) {
      state.count = 0;
      clearTimeout(state.timer);
      setSecretOpen(true);
    }
  }, []);

  const applySecretTheme = useCallback((vars, source) => {
    const nextTheme = { vars, source, updatedAt: new Date().toISOString() };
    applyThemeVariables(vars);
    localStorage.setItem(SECRET_THEME_STORAGE_KEY, JSON.stringify(nextTheme));
    setThemeInfo(nextTheme);
  }, []);

  const resetSecretTheme = useCallback(() => {
    applyThemeVariables({});
    localStorage.removeItem(SECRET_THEME_STORAGE_KEY);
    setThemeInfo(null);
  }, []);

  return (
    <div className="app-shell">
      {isCatalog && <Navbar variant="catalog" onSecretTitleClick={handleSecretTitleClick} />}
      {isAdminPage && <Navbar variant="admin" onSecretTitleClick={handleSecretTitleClick} />}
      <Routes>
        <Route path="/" element={<Landing onSecretTitleClick={handleSecretTitleClick} />} />
        <Route path="/catalogo" element={<UserCatalog />} />
        <Route path="/admin-login" element={<Login />} />
        <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
        <Route path="/admin/livros" element={<AdminGuard><AdminBooks /></AdminGuard>} />
        <Route path="/admin/usuarios" element={<AdminGuard><AdminUsers /></AdminGuard>} />
        <Route path="/admin/emprestimos" element={<AdminGuard><AdminLoans /></AdminGuard>} />
        <Route path="/admin/fila" element={<AdminGuard><AdminWaitlist /></AdminGuard>} />
        <Route path="/admin/leituras" element={<AdminGuard><AdminReads /></AdminGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {secretOpen && (
        <SecretPopup
          onClose={() => setSecretOpen(false)}
          onApplyTheme={applySecretTheme}
          onResetTheme={resetSecretTheme}
          themeInfo={themeInfo}
        />
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';

export default function Landing({ onSecretTitleClick }) {
  return (
    <div className="landing-wrap">
      <div className="landing-card glass glass-strong">
        <h1 className="landing-logo" onClick={onSecretTitleClick}>Biblio</h1>
        <p className="landing-subtitle">desenvolvido por @fael.records</p>

        <div className="landing-actions">
          <Link to="/catalogo" className="btn accent block" style={{ padding: '14px 24px', fontSize: 14 }}>
            Explorar catálogo
          </Link>
          <Link to="/admin-login" className="btn ghost block" style={{ padding: '14px 24px', fontSize: 14 }}>
            Entrar como administrador
          </Link>
        </div>
      </div>
    </div>
  );
}

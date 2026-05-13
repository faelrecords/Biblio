import { updates } from '../data/updates';

export default function AdminUpdates() {
  return (
    <div className="container">
      <div className="subtitle">Sistema</div>
      <h1 style={{ marginBottom: 24 }}>Updates</h1>
      <div className="glass list-card">
        {updates.map(update => (
          <div key={update.version} className="list-row" style={{ alignItems: 'flex-start' }}>
            <div className="badge approved">{update.version}</div>
            <div>
              <div className="list-main-title">{update.title}</div>
              <div className="list-main-sub">
                {new Date(update.date).toLocaleDateString('pt-BR')} · {update.summary}
              </div>
              <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {update.items.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

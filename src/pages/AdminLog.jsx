import { useEffect, useMemo, useState } from 'react';
import { api, getProfile } from '../api';

const hiddenDetailKeys = new Set([
  'retroactive_source', 'loan_id', 'notification_id', 'enabled', 'id'
]);

const detailLabels = {
  reader: 'Leitor',
  book: 'Livro',
  recipient: 'Destinatário',
  title: 'Título',
  name: 'Nome',
  message: 'Mensagem',
  days: 'Prazo em dias',
  user_id: 'Usuário',
  book_id: 'Livro',
  rating: 'Nota',
  counts_as_read: 'Contabilizar leitura',
  send_bitrix: 'Enviar no Bitrix'
};

function friendlyAction(item) {
  const action = item.action || 'Ação administrativa';
  if (!/^(GET|POST|PUT|DELETE)\s/.test(action)) return action;
  const id = item.path?.match(/\/(\d+)/)?.[1];
  if (item.path === '/categories') return 'Criou uma categoria';
  if (/^\/categories\/\d+$/.test(item.path)) return `Excluiu a categoria ${id}`;
  if (/^\/reads\/\d+$/.test(item.path)) return `Alterou o registro de leitura ${id}`;
  if (/^\/waitlist\/\d+$/.test(item.path)) return `Removeu o registro ${id} da fila de espera`;
  if (/^\/users\/\d+\/regenerate-code$/.test(item.path)) return `Gerou um novo código para o usuário ${id}`;
  if (/^\/loans\/\d+\/renew$/.test(item.path)) return `Renovou o empréstimo ${id}`;
  if (item.path === '/loans/self-approve') return 'Registrou um empréstimo direto';
  if (item.path === '/loans/request') return 'Solicitou um empréstimo';
  if (item.path === '/notifications/send-all') return 'Enviou um aviso para todos os usuários';
  if (/^\/notifications\/\d+\/read$/.test(item.path)) return 'Marcou uma notificação como lida';
  if (item.path === '/notifications/read-all') return 'Marcou todas as notificações como lidas';
  return 'Realizou uma ação administrativa';
}

function formatDetails(details, action = '') {
  const entries = Object.entries(details || {}).filter(([key, value]) => (
    !hiddenDetailKeys.has(key)
    && value !== '' && value !== null && value !== undefined && value !== '[oculto]'
    && !action.toLowerCase().includes(String(value).toLowerCase())
  ));
  if (!entries.length) return '';
  return entries.map(([key, value]) => {
    const formatted = typeof value === 'boolean'
      ? (value ? 'Sim' : 'Não')
      : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `${detailLabels[key] || 'Informação'}: ${formatted}`;
  }).join(' · ');
}

export default function AdminLog() {
  const profile = getProfile();
  const [items, setItems] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api.get('/audit-logs?limit=500').then(setItems).catch(err => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items || [];
    return (items || []).filter(item => (
      `${item.admin_name} ${friendlyAction(item)} ${formatDetails(item.details, friendlyAction(item))}`.toLowerCase().includes(query)
    ));
  }, [items, search]);

  async function remove(item) {
    if (!confirm(`Excluir este registro do Log?\n\n${item.action}`)) return;
    setBusyId(item.id);
    setError('');
    try {
      await api.del(`/audit-logs/${item.id}`);
      setItems(current => current.filter(entry => entry.id !== item.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!items && !error) return <div className="container"><div className="spinner" /></div>;

  return (
    <div className="container">
      <div className="subtitle">Administração</div>
      <h1 style={{ marginBottom: 8 }}>Log</h1>
      <p className="hero-sub">Histórico das ações realizadas pelos administradores.</p>

      {error && <div className="error-msg">{error}</div>}
      <div className="glass list-card" style={{ marginBottom: 18 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Buscar no log</label>
          <input
            className="input"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Administrador, ação ou registro"
          />
        </div>
      </div>

      <div className="glass list-card">
        {filtered.length === 0 && <div className="empty-state">Nenhuma ação registrada.</div>}
        {filtered.map(item => {
          const action = friendlyAction(item);
          const details = formatDetails(item.details, action);
          return (
            <div className="list-row audit-log-row" key={item.id}>
              <div className="avatar">{(item.admin_name || '?').charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="list-main-title">{action}</div>
                <div className="list-main-sub">
                  {item.admin_name} · {new Date(item.created_at).toLocaleString('pt-BR')}
                </div>
                {details && <div className="audit-log-details">{details}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {profile?.is_super && (
                  <button className="btn sm danger" disabled={busyId === item.id} onClick={() => remove(item)}>
                    Excluir
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

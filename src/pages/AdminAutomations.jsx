import { useEffect, useState } from 'react';
import { api } from '../api';

const TRIGGERS = {
  loan_due_soon: {
    label: 'Empréstimo a expirar',
    description: 'Dispara antes da data prevista de devolução.',
    placeholders: '{usuario}, {livro}, {dias}, {data_devolucao}'
  },
  waitlist_release: {
    label: 'Livro liberado para o próximo da fila',
    description: 'Dispara quando um livro com fila é devolvido.',
    placeholders: '{usuario}, {livro}, {data_limite}'
  }
};

const EMPTY_CUSTOM = {
  name: '',
  trigger: 'loan_due_soon',
  enabled: true,
  days_before: 2,
  title: 'Lembrete da biblioteca',
  message: 'Olá, {usuario}. O empréstimo de {livro} expira em {dias} dia(s), em {data_devolucao}.'
};

export default function AdminAutomations() {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [custom, setCustom] = useState(EMPTY_CUSTOM);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    try {
      setError('');
      setAutomations(await api.get('/automations'));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function updateLocal(id, patch) {
    setAutomations(current => current.map(item => item.id === id ? { ...item, ...patch } : item));
    setMessage('');
  }

  async function save(automation, patch = {}) {
    setSavingId(automation.id);
    setError('');
    setMessage('');
    try {
      const updated = await api.put(`/automations/${automation.id}`, { ...automation, ...patch });
      setAutomations(current => current.map(item => item.id === updated.id ? updated : item));
      setMessage('Automação salva.');
    } catch (e) {
      setError(e.message);
      load();
    } finally {
      setSavingId(null);
    }
  }

  async function createAutomation(event) {
    event.preventDefault();
    setError('');
    try {
      const created = await api.post('/automations', custom);
      setAutomations(current => [...current, created]);
      setCustom(EMPTY_CUSTOM);
      setShowCreate(false);
      setMessage('Automação criada.');
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeAutomation(automation) {
    if (!confirm(`Excluir a automação "${automation.name}"?`)) return;
    try {
      await api.del(`/automations/${automation.id}`);
      setAutomations(current => current.filter(item => item.id !== automation.id));
      setMessage('Automação excluída.');
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <div className="container"><div className="spinner" /></div>;

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <div className="subtitle">Mensagens e regras</div>
          <h1>Automações</h1>
          <p className="hero-sub" style={{ marginTop: 8 }}>
            Configure mensagens enviadas no Biblio e no chat do Bitrix24.
          </p>
        </div>
        <button className="btn accent" onClick={() => setShowCreate(value => !value)}>
          {showCreate ? 'Cancelar' : '+ Nova automação'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {message && <div className="success-msg">{message}</div>}

      {showCreate && (
        <form className="glass automation-create-card" onSubmit={createAutomation}>
          <div>
            <div className="subtitle">Regra personalizada</div>
            <h2>Nova automação</h2>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Nome da automação</label>
              <input className="input" value={custom.name}
                     onChange={e => setCustom({ ...custom, name: e.target.value })}
                     placeholder="Ex.: Segundo lembrete de devolução" />
            </div>
            <div className="field">
              <label>Quando executar</label>
              <select className="input" value={custom.trigger}
                      onChange={e => setCustom({ ...custom, trigger: e.target.value })}>
                {Object.entries(TRIGGERS).map(([value, trigger]) => (
                  <option key={value} value={value}>{trigger.label}</option>
                ))}
              </select>
            </div>
          </div>
          {custom.trigger === 'loan_due_soon' && (
            <div className="field automation-days-field">
              <label>Dias antes de expirar</label>
              <input type="number" min={1} max={60} className="input"
                     value={custom.days_before}
                     onChange={e => setCustom({ ...custom, days_before: Number(e.target.value) })} />
            </div>
          )}
          <div className="field">
            <label>Título da mensagem</label>
            <input className="input" value={custom.title}
                   onChange={e => setCustom({ ...custom, title: e.target.value })} />
          </div>
          <div className="field">
            <label>Mensagem</label>
            <textarea className="textarea" value={custom.message}
                      onChange={e => setCustom({ ...custom, message: e.target.value })} />
            <div className="hint automation-placeholders">
              Campos disponíveis: {TRIGGERS[custom.trigger].placeholders}
            </div>
          </div>
          <div className="automation-form-actions">
            <button type="button" className="btn ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
            <button className="btn accent" disabled={!custom.name.trim() || !custom.title.trim() || !custom.message.trim()}>
              Criar automação
            </button>
          </div>
        </form>
      )}

      <div className="automation-grid">
        {automations.map(automation => {
          const trigger = TRIGGERS[automation.trigger];
          return (
            <article key={automation.id} className={`glass automation-card ${automation.enabled ? 'enabled' : ''}`}>
              <div className="automation-card-head">
                <div>
                  <div className="automation-kicker">
                    {automation.built_in ? 'Automação padrão' : 'Regra personalizada'}
                  </div>
                  <input
                    className="automation-name-input"
                    value={automation.name}
                    disabled={automation.built_in}
                    onChange={e => updateLocal(automation.id, { name: e.target.value })}
                    aria-label="Nome da automação"
                  />
                </div>
                <label className="toggle-switch" title={automation.enabled ? 'Desativar' : 'Ativar'}>
                  <input type="checkbox" checked={automation.enabled}
                         onChange={e => {
                           const enabled = e.target.checked;
                           updateLocal(automation.id, { enabled });
                           save(automation, { enabled });
                         }} />
                  <span className="track"></span>
                </label>
              </div>

              <div className="automation-trigger">
                <span className="badge approved">{trigger.label}</span>
                <span>{trigger.description}</span>
              </div>

              {!automation.built_in && (
                <div className="field">
                  <label>Quando executar</label>
                  <select className="input" value={automation.trigger}
                          onChange={e => updateLocal(automation.id, { trigger: e.target.value })}>
                    {Object.entries(TRIGGERS).map(([value, item]) => (
                      <option key={value} value={value}>{item.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {automation.trigger === 'loan_due_soon' && (
                <div className="field automation-days-field">
                  <label>Dias antes de expirar</label>
                  <input type="number" min={1} max={60} className="input"
                         value={automation.days_before}
                         onChange={e => updateLocal(automation.id, { days_before: Number(e.target.value) })} />
                </div>
              )}

              <div className="field">
                <label>Título da mensagem</label>
                <input className="input" value={automation.title}
                       onChange={e => updateLocal(automation.id, { title: e.target.value })} />
              </div>
              <div className="field">
                <label>Mensagem automática</label>
                <textarea className="textarea" value={automation.message}
                          onChange={e => updateLocal(automation.id, { message: e.target.value })} />
                <div className="hint automation-placeholders">
                  Campos disponíveis: {TRIGGERS[automation.trigger].placeholders}
                </div>
              </div>

              <div className="automation-form-actions">
                {!automation.built_in && (
                  <button type="button" className="btn sm danger" onClick={() => removeAutomation(automation)}>
                    Excluir
                  </button>
                )}
                <button type="button" className="btn sm accent"
                        disabled={savingId === automation.id}
                        onClick={() => save(automation)}>
                  {savingId === automation.id ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

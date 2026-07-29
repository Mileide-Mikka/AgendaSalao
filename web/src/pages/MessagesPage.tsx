import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type Client } from '../lib/api';
import { formatBrPhone, isValidBrMobile, phoneDigits } from '../lib/phone';
import {
  MESSAGE_TEMPLATES,
  applyTemplate,
  openWhatsApp,
  readWhatsAppConnection,
  saveWhatsAppConnection,
  type WhatsAppConnection,
} from '../lib/whatsapp';

const SALON_SETTINGS_KEY = 'belle-salon-settings';

function salonName(): string {
  try {
    const raw = localStorage.getItem(SALON_SETTINGS_KEY);
    if (!raw) return 'nosso salão';
    const parsed = JSON.parse(raw) as { name?: string };
    return parsed.name?.trim() || 'nosso salão';
  } catch {
    return 'nosso salão';
  }
}

type ApiStatus = {
  configured: boolean;
  displayPhone: string | null;
  notes: string[];
};

export function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [connection, setConnection] = useState<WhatsAppConnection>(() =>
    readWhatsAppConnection(),
  );
  const [connectPhone, setConnectPhone] = useState(() =>
    formatBrPhone(readWhatsAppConnection().phone),
  );
  const [connectLabel, setConnectLabel] = useState(
    () => readWhatsAppConnection().label || '',
  );
  const [connectError, setConnectError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [templateId, setTemplateId] = useState(MESSAGE_TEMPLATES[0].id);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<'whatsapp' | 'prefer'>('whatsapp');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void api.clients
      .list()
      .then(setClients)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Erro ao carregar clientes'),
      );
    void api.whatsapp
      .status()
      .then((s) =>
        setApiStatus({
          configured: s.configured,
          displayPhone: s.displayPhone,
          notes: s.notes,
        }),
      )
      .catch(() =>
        setApiStatus({ configured: false, displayPhone: null, notes: [] }),
      );
  }, []);

  useEffect(() => {
    const fromQuery = searchParams.get('clientId');
    if (fromQuery) setSelectedId(fromQuery);
  }, [searchParams]);

  const reachable = useMemo(() => {
    return clients.filter((c) => {
      if (filter === 'prefer') return Boolean(c.prefersMessageContact);
      return Boolean(c.phoneIsWhatsapp);
    });
  }, [clients, filter]);

  const selected = clients.find((c) => c.id === selectedId) ?? null;
  const canSendDirect = Boolean(apiStatus?.configured);

  useEffect(() => {
    if (!selected) return;
    const tpl =
      MESSAGE_TEMPLATES.find((t) => t.id === templateId) ?? MESSAGE_TEMPLATES[0];
    setMessage(
      applyTemplate(tpl.body, {
        nome: selected.name.split(' ')[0] || selected.name,
        salao: salonName(),
      }),
    );
  }, [selectedId, templateId, selected]);

  function onConnect(e: FormEvent) {
    e.preventDefault();
    setConnectError(null);
    if (!isValidBrMobile(connectPhone)) {
      setConnectError('Informe o celular do WhatsApp do estabelecimento com DDD.');
      return;
    }
    const next: WhatsAppConnection = {
      phone: phoneDigits(connectPhone),
      label: connectLabel.trim() || 'WhatsApp do salão',
      connected: true,
      connectedAt: new Date().toISOString(),
    };
    saveWhatsAppConnection(next);
    setConnection(next);
  }

  function onDisconnect() {
    const next: WhatsAppConnection = {
      ...connection,
      connected: false,
      connectedAt: undefined,
    };
    saveWhatsAppConnection(next);
    setConnection(next);
  }

  async function sendToClient() {
    if (!selected?.phoneIsWhatsapp) {
      setError('Selecione um cliente com WhatsApp cadastrado.');
      return;
    }
    if (!message.trim()) {
      setError('Escreva uma mensagem.');
      return;
    }

    setError(null);
    setSuccess(null);

    if (canSendDirect) {
      setSending(true);
      try {
        const result = await api.whatsapp.send({
          to: selected.phone,
          message: message.trim(),
        });
        setSuccess(
          `Mensagem enviada diretamente pelo WhatsApp do salão${
            result.messageId ? ` (${result.messageId.slice(0, 12)}…)` : ''
          }.`,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Falha ao enviar pela API da Meta',
        );
      } finally {
        setSending(false);
      }
      return;
    }

    if (!connection.connected) {
      setError(
        'Configure a Cloud API da Meta no servidor (.env) para envio direto, ou salve o número do salão abaixo para o modo link.',
      );
      return;
    }
    openWhatsApp(selected.phone, message);
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Comunicações</h1>
          <p>Envio pelo WhatsApp do salão via API da Meta (sem tela wa.me).</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}
      {success ? (
        <div
          className="error-banner"
          style={{ color: 'var(--ok)', background: 'var(--ok-soft)' }}
        >
          {success}
        </div>
      ) : null}

      <section className="settings-card msg-connect">
        <h2>WhatsApp Cloud API (Meta)</h2>
        {canSendDirect ? (
          <div className="msg-status">
            <div>
              <strong className="msg-status__ok">API conectada</strong>
              <p>
                Envio direto ativo
                {apiStatus?.displayPhone
                  ? ` · ${formatBrPhone(apiStatus.displayPhone)}`
                  : ''}
              </p>
              <p className="entity-card__meta">
                Mensagens saem do número oficial do salão, sem abrir o site do
                WhatsApp.
              </p>
            </div>
          </div>
        ) : (
          <div className="msg-setup">
            <p className="msg-lead">
              A tela verde do WhatsApp (wa.me) é o modo antigo por link. Para
              mandar <strong>direto do sistema</strong>, use a Cloud API da Meta.
            </p>
            <ul className="msg-steps">
              <li>
                Crie um app em{' '}
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noreferrer"
                >
                  developers.facebook.com
                </a>{' '}
                e adicione o produto <strong>WhatsApp</strong>.
              </li>
              <li>
                Em <strong>API Setup</strong>, copie o{' '}
                <strong>Temporary access token</strong> (ou gere um permanente) e
                o <strong>Phone number ID</strong>.
              </li>
              <li>
                Cole no arquivo <code>.env</code> da API:
                <pre className="msg-code">{`WHATSAPP_ACCESS_TOKEN=seu_token
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id
WHATSAPP_DISPLAY_PHONE=11999990000`}</pre>
              </li>
              <li>Reinicie a API (`yarn start:dev`) e recarregue esta página.</li>
            </ul>
            <p className="msg-lead">
              <strong>Custo:</strong> a Cloud API em si é gratuita para usar.
              Respostas de atendimento na janela de 24h (depois que o cliente
              escreve) são gratuitas. Modelos de marketing/utilidade fora dessa
              janela podem ser cobrados pela Meta.
            </p>
          </div>
        )}
      </section>

      <section className="settings-card msg-connect">
        <h2>Número de referência do salão (opcional)</h2>
        <p className="msg-lead">
          Usado só como identificação local / fallback por link se a API ainda
          não estiver configurada.
        </p>

        {connection.connected ? (
          <div className="msg-status">
            <div>
              <strong>Salvo</strong>
              <p>
                {connection.label || 'WhatsApp'} ·{' '}
                {formatBrPhone(connection.phone)}
              </p>
            </div>
            <button type="button" className="btn btn--soft" onClick={onDisconnect}>
              Remover
            </button>
          </div>
        ) : (
          <form className="form-grid" onSubmit={onConnect}>
            {connectError ? <div className="error-banner">{connectError}</div> : null}
            <div className="form-grid form-grid--2">
              <label className="field">
                <span>Número do WhatsApp</span>
                <input
                  value={connectPhone}
                  onChange={(e) => setConnectPhone(formatBrPhone(e.target.value))}
                  placeholder="(11) 98765-4321"
                  inputMode="tel"
                  required
                />
              </label>
              <label className="field">
                <span>Nome de exibição</span>
                <input
                  value={connectLabel}
                  onChange={(e) => setConnectLabel(e.target.value)}
                  placeholder="Ex.: Belle Salão"
                />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn--soft">
                Salvar número
              </button>
            </div>
          </form>
        )}
      </section>

      <div className="msg-layout">
        <section className="settings-card msg-clients">
          <div className="msg-clients__head">
            <h2>Clientes</h2>
            <div className="filters" style={{ margin: 0 }}>
              <button
                type="button"
                className={filter === 'whatsapp' ? 'is-active' : ''}
                onClick={() => setFilter('whatsapp')}
              >
                Com WhatsApp
              </button>
              <button
                type="button"
                className={filter === 'prefer' ? 'is-active' : ''}
                onClick={() => setFilter('prefer')}
              >
                Preferem mensagem
              </button>
            </div>
          </div>

          <ul className="msg-list">
            {reachable.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  className={`msg-list__item${selectedId === client.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setSelectedId(client.id);
                    setSearchParams({ clientId: client.id });
                  }}
                >
                  <strong>{client.name}</strong>
                  <span>{formatBrPhone(client.phone)}</span>
                  {client.prefersMessageContact ? (
                    <em>Prefere mensagem</em>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          {!reachable.length ? (
            <p className="empty">
              Nenhum cliente com WhatsApp. Cadastre o número e marque a opção no
              perfil do cliente.
            </p>
          ) : null}
        </section>

        <section className="settings-card msg-compose">
          <h2>Enviar mensagem</h2>
          {!canSendDirect ? (
            <p className="msg-lead">
              Sem Cloud API configurada, o botão ainda abre o WhatsApp no
              navegador (tela wa.me). Configure o .env para envio direto.
            </p>
          ) : null}
          {!selected ? (
            <p className="msg-lead">Selecione um cliente à esquerda.</p>
          ) : (
            <>
              <p className="msg-lead">
                Para <strong>{selected.name}</strong> ·{' '}
                {formatBrPhone(selected.phone)}
              </p>
              <label className="field">
                <span>Modelo</span>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  {MESSAGE_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Mensagem</span>
                <textarea
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                />
              </label>
              <div className="modal__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={sending || (!canSendDirect && !connection.connected)}
                  onClick={() => void sendToClient()}
                >
                  {sending
                    ? 'Enviando…'
                    : canSendDirect
                      ? 'Enviar pelo WhatsApp do salão'
                      : 'Abrir no WhatsApp (link)'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}

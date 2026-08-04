import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type Client } from '../lib/api';
import { initials } from '../lib/format';
import { formatBrPhone } from '../lib/phone';
import {
  MESSAGE_TEMPLATES,
  appendMessageLog,
  applyTemplate,
  messagesForClient,
  openWhatsAppWeb,
  readMessageLog,
  subscribeMessageLog,
  type LocalMessage,
} from '../lib/whatsapp';

import { readLocalSalonSettings } from '../lib/salonSettings';

const DRAFTS_KEY = 'belle-message-drafts';
const CLIENTS_POLL_MS = 8_000;

function salonName(): string {
  const name = readLocalSalonSettings().name?.trim();
  return name || 'nosso salão';
}

function readDrafts(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(DRAFTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeDraft(clientId: string, body: string) {
  const all = readDrafts();
  if (!body.trim()) delete all[clientId];
  else all[clientId] = body;
  sessionStorage.setItem(DRAFTS_KEY, JSON.stringify(all));
}

function formatMsgTime(iso: string, now = Date.now()) {
  const t = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.round((now - t) / 1000));
  if (diffSec < 10) return 'agora';
  if (diffSec < 60) return `há ${diffSec}s`;
  if (diffSec < 3600) return `há ${Math.floor(diffSec / 60)} min`;
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [log, setLog] = useState<LocalMessage[]>(() => readMessageLog());
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [templateId, setTemplateId] = useState(MESSAGE_TEMPLATES[0].id);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<'whatsapp' | 'prefer' | 'all'>('whatsapp');
  const [tipOpen, setTipOpen] = useState(false);
  const [liveClock, setLiveClock] = useState(() => Date.now());
  const [syncLabel, setSyncLabel] = useState('ao vivo');

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const reloadLog = useCallback(() => {
    setLog(readMessageLog());
  }, []);

  const loadClients = useCallback(async (silent = false) => {
    try {
      if (!silent) setSyncLabel('atualizando…');
      const list = await api.clients.list();
      setClients(list);
      setError(null);
      setSyncLabel('ao vivo');
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
      }
      setSyncLabel('reconectando…');
    }
  }, []);

  useEffect(() => {
    void loadClients(false);
  }, [loadClients]);

  /* Real-time: clientes e histórico */
  useEffect(() => {
    const tick = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadClients(true);
    }, CLIENTS_POLL_MS);

    const onFocus = () => void loadClients(true);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadClients(true);
        reloadLog();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadClients, reloadLog]);

  useEffect(() => subscribeMessageLog(reloadLog), [reloadLog]);

  useEffect(() => {
    const id = window.setInterval(() => setLiveClock(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const fromQuery = searchParams.get('clientId');
    if (fromQuery) setSelectedId(fromQuery);
  }, [searchParams]);

  const lastByClient = useMemo(() => {
    const map = new Map<string, LocalMessage>();
    for (const msg of log) {
      const prev = map.get(msg.clientId);
      if (!prev || prev.createdAt < msg.createdAt) map.set(msg.clientId, msg);
    }
    return map;
  }, [log]);

  const reachable = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => {
        if (filter === 'prefer') return Boolean(c.prefersMessageContact);
        if (filter === 'whatsapp') return Boolean(c.phoneIsWhatsapp);
        return true;
      })
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          phoneDigitsLoose(c.phone).includes(phoneDigitsLoose(q))
        );
      })
      .sort((a, b) => {
        const la = lastByClient.get(a.id)?.createdAt ?? '';
        const lb = lastByClient.get(b.id)?.createdAt ?? '';
        if (la !== lb) return lb.localeCompare(la);
        return a.name.localeCompare(b.name, 'pt-BR');
      });
  }, [clients, filter, query, lastByClient]);

  const selected = clients.find((c) => c.id === selectedId) ?? null;

  const thread = useMemo(
    () => (selectedId ? messagesForClient(selectedId, log) : []),
    [selectedId, log],
  );

  /* Ao trocar de conversa: restaura rascunho ou aplica modelo */
  useEffect(() => {
    if (!selected) {
      setMessage('');
      return;
    }
    const saved = readDrafts()[selected.id];
    if (saved && saved.trim()) {
      setMessage(saved);
      return;
    }
    const tpl =
      MESSAGE_TEMPLATES.find((t) => t.id === templateId) ?? MESSAGE_TEMPLATES[0];
    const body = applyTemplate(tpl.body, {
      nome: selected.name.split(' ')[0] || selected.name,
      salao: salonName(),
    });
    setMessage(body);
    writeDraft(selected.id, body);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao mudar conversa
  }, [selectedId]);

  function applyTemplateToComposer(nextTemplateId: string) {
    if (!selected) return;
    setTemplateId(nextTemplateId);
    const tpl =
      MESSAGE_TEMPLATES.find((t) => t.id === nextTemplateId) ?? MESSAGE_TEMPLATES[0];
    const body = applyTemplate(tpl.body, {
      nome: selected.name.split(' ')[0] || selected.name,
      salao: salonName(),
    });
    setMessage(body);
    writeDraft(selected.id, body);
  }

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [thread.length, message, selectedId]);

  function selectClient(client: Client) {
    setSelectedId(client.id);
    setSearchParams({ clientId: client.id });
    setError(null);
    setHint(null);
  }

  function onMessageChange(value: string) {
    setMessage(value);
    if (selectedId) writeDraft(selectedId, value);
  }

  function sendToClient() {
    if (!selected) {
      setError('Selecione um cliente na lista.');
      return;
    }
    if (!selected.phoneIsWhatsapp) {
      setError('Este cliente não está marcado com WhatsApp. Edite o cadastro.');
      return;
    }
    if (!message.trim()) {
      setError('Escreva uma mensagem antes de enviar.');
      return;
    }

    setError(null);
    const entry = appendMessageLog({
      clientId: selected.id,
      clientName: selected.name,
      phone: selected.phone,
      body: message.trim(),
    });
    /* Optimistic UI: also patch state immediately (same tab is instant) */
    setLog((prev) => [entry, ...prev.filter((m) => m.id !== entry.id)].slice(0, 200));
    writeDraft(selected.id, '');
    setMessage('');
    openWhatsAppWeb(selected.phone, entry.body);
    setHint(
      'Histórico atualizado. Confirme o envio no WhatsApp Web — ao voltar, a lista e o chat já estarão sincronizados.',
    );
  }

  return (
    <div className="chat-page">
      <header className="page-head chat-page__head">
        <div>
          <h1>Comunicações</h1>
          <p>Central de mensagens do salão — lista e histórico atualizam em tempo real.</p>
        </div>
        <div className="chat-head-actions">
          <span className="chat-live" title="Clientes e histórico sincronizam automaticamente">
            <span className="chat-live__dot" aria-hidden />
            {syncLabel}
          </span>
          <button
            type="button"
            className="btn btn--soft"
            onClick={() => setTipOpen((v) => !v)}
          >
            {tipOpen ? 'Ocultar dica' : 'Como funciona'}
          </button>
        </div>
      </header>

      {tipOpen ? (
        <div className="chat-tip">
          <p>
            Esta tela atualiza sozinha: novos clientes no cadastro, rascunhos, histórico e
            a ordem da lista. O envio final ainda passa pelo WhatsApp Web (gratuito).{' '}
            <strong>Respostas do cliente no WhatsApp não entram aqui</strong> — a Meta não
            libera isso sem a API paga.
          </p>
          <p>
            Mantenha{' '}
            <a href="https://web.whatsapp.com" target="_blank" rel="noreferrer">
              web.whatsapp.com
            </a>{' '}
            logado no navegador com o celular do salão.
          </p>
        </div>
      ) : null}

      {error ? <div className="error-banner">{error}</div> : null}
      {hint ? (
        <div
          className="error-banner"
          style={{ color: 'var(--ok)', background: 'var(--ok-soft)' }}
        >
          {hint}
        </div>
      ) : null}

      <div className="chat-shell">
        <aside className="chat-sidebar">
          <div className="chat-sidebar__search">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente…"
              aria-label="Buscar cliente"
            />
          </div>
          <div className="chat-sidebar__filters" role="tablist" aria-label="Filtro">
            {(
              [
                ['whatsapp', 'WhatsApp'],
                ['prefer', 'Preferem msg'],
                ['all', 'Todos'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={filter === id ? 'is-active' : ''}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <ul className="chat-contacts">
            {reachable.map((client) => {
              const last = lastByClient.get(client.id);
              const draft =
                client.id === selectedId && message.trim()
                  ? message.trim()
                  : readDrafts()[client.id];
              const preview = draft
                ? `Rascunho: ${truncate(draft, 40)}`
                : last?.body
                  ? truncate(last.body, 48)
                  : formatBrPhone(client.phone);
              return (
                <li key={client.id}>
                  <button
                    type="button"
                    className={`chat-contact${selectedId === client.id ? ' is-active' : ''}`}
                    onClick={() => selectClient(client)}
                  >
                    <span className="chat-avatar" aria-hidden>
                      {initials(client.name)}
                    </span>
                    <span className="chat-contact__body">
                      <span className="chat-contact__top">
                        <strong>{client.name}</strong>
                        {last ? (
                          <time dateTime={last.createdAt}>
                            {formatMsgTime(last.createdAt, liveClock)}
                          </time>
                        ) : null}
                      </span>
                      <span className="chat-contact__preview">{preview}</span>
                    </span>
                    {!client.phoneIsWhatsapp ? (
                      <span className="chat-badge chat-badge--warn">sem WA</span>
                    ) : client.prefersMessageContact ? (
                      <span className="chat-badge">msg</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {!reachable.length ? (
            <p className="chat-empty-side">
              Nenhum cliente neste filtro. Cadastre WhatsApp no perfil do cliente.
            </p>
          ) : null}
        </aside>

        <section className="chat-main">
          {!selected ? (
            <div className="chat-empty">
              <div className="chat-empty__icon" aria-hidden>
                ✂
              </div>
              <h2>Selecione uma conversa</h2>
              <p>
                Escolha um cliente à esquerda. A lista e o histórico se atualizam
                automaticamente enquanto você trabalha.
              </p>
            </div>
          ) : (
            <>
              <header className="chat-thread__head">
                <div className="chat-thread__who">
                  <span className="chat-avatar chat-avatar--lg" aria-hidden>
                    {initials(selected.name)}
                  </span>
                  <div>
                    <h2>{selected.name}</h2>
                    <p>
                      {formatBrPhone(selected.phone)}
                      {selected.phoneIsWhatsapp ? ' · WhatsApp' : ' · sem WhatsApp'}
                      {selected.prefersMessageContact ? ' · prefere mensagem' : ''}
                    </p>
                  </div>
                </div>
                <span className="chat-live chat-live--sm">
                  <span className="chat-live__dot" aria-hidden />
                  {syncLabel}
                </span>
              </header>

              <div className="chat-thread__body">
                {thread.length === 0 && !message.trim() ? (
                  <div className="chat-thread__placeholder">
                    <p>
                      Nenhuma mensagem ainda para {selected.name.split(' ')[0]}. Escreva
                      abaixo — o rascunho aparece aqui na hora.
                    </p>
                  </div>
                ) : (
                  <ul className="chat-bubbles">
                    {thread.map((msg) => (
                      <li key={msg.id} className="chat-bubble chat-bubble--out">
                        <p>{msg.body}</p>
                        <time dateTime={msg.createdAt}>
                          {formatMsgTime(msg.createdAt, liveClock)} · aberto no WhatsApp
                        </time>
                      </li>
                    ))}
                  </ul>
                )}

                {message.trim() ? (
                  <div className="chat-bubble chat-bubble--draft" aria-live="polite">
                    <span className="chat-bubble__label">Rascunho · ao vivo</span>
                    <p>{message.trim()}</p>
                  </div>
                ) : null}
                <div ref={threadEndRef} />
              </div>

              <footer className="chat-composer">
                <div className="chat-templates" role="group" aria-label="Modelos">
                  {MESSAGE_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`chat-chip${templateId === t.id ? ' is-active' : ''}`}
                      onClick={() => applyTemplateToComposer(t.id)}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
                <div className="chat-composer__row">
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => onMessageChange(e.target.value)}
                    maxLength={1000}
                    placeholder="Escreva a mensagem…"
                    aria-label="Mensagem"
                  />
                  <button
                    type="button"
                    className="btn btn--primary chat-send"
                    disabled={!message.trim() || !selected.phoneIsWhatsapp}
                    onClick={sendToClient}
                  >
                    Enviar no WhatsApp
                  </button>
                </div>
                <p className="chat-composer__note">
                  Atualização ao vivo da central do salão. Respostas do cliente só aparecem
                  no WhatsApp (sem API da Meta).
                </p>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function phoneDigitsLoose(value: string) {
  return value.replace(/\D/g, '');
}

function truncate(text: string, max: number) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

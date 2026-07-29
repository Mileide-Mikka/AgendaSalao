import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, type Client } from '../lib/api';
import { formatCurrency, initials } from '../lib/format';
import {
  formatBrPhone,
  isValidBrMobile,
  isValidBrPhone,
  isValidEmail,
  phoneDigits,
} from '../lib/phone';

export function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [phoneIsWhatsapp, setPhoneIsWhatsapp] = useState(false);
  const [prefersMessageContact, setPrefersMessageContact] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load(q = search) {
    try {
      setItems(await api.clients.list(q || undefined));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao listar clientes');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setPhoneIsWhatsapp(false);
    setPrefersMessageContact(false);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setName(client.name);
    setPhone(formatBrPhone(client.phone));
    setEmail(client.email ?? '');
    setNotes(client.notes ?? '');
    setPhoneIsWhatsapp(Boolean(client.phoneIsWhatsapp));
    setPrefersMessageContact(Boolean(client.prefersMessageContact));
    setFormError(null);
    setOpen(true);
  }

  function validateForm(): string | null {
    if (name.trim().length < 2) {
      return 'O nome deve ter pelo menos 2 caracteres.';
    }
    if (!isValidBrPhone(phone)) {
      return 'Telefone inválido. Use DDD + número (ex.: (11) 98765-4321).';
    }
    if (phoneIsWhatsapp && !isValidBrMobile(phone)) {
      return 'Para WhatsApp, informe um celular com DDD (11 dígitos).';
    }
    if (prefersMessageContact && !phoneIsWhatsapp) {
      return 'Para preferir mensagem, marque que o número é WhatsApp.';
    }
    if (!isValidEmail(email)) {
      return 'E-mail inválido.';
    }
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError(null);
    setError(null);

    const payload = {
      name: name.trim(),
      phone: phoneDigits(phone),
      email: email.trim(),
      notes: notes.trim(),
      phoneIsWhatsapp,
      prefersMessageContact,
    };

    try {
      if (editing) {
        await api.clients.update(editing.id, payload);
      } else {
        await api.clients.create(payload);
      }
      setOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Clientes</h1>
          <p>
            {items.length} cliente{items.length === 1 ? '' : 's'} cadastrado
            {items.length === 1 ? '' : 's'}
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          + Nova cliente
        </button>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="toolbar">
        <label className="search">
          <SearchIcon />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void load()}
            placeholder="Buscar cliente..."
          />
        </label>
        <button type="button" className="btn btn--soft" onClick={() => void load()}>
          Buscar
        </button>
      </div>

      <section className="cards-grid">
        {items.map((client) => (
          <article key={client.id} className="entity-card">
            <div className="entity-card__top">
              <div className="avatar">{initials(client.name)}</div>
              <div>
                <h3>{client.name}</h3>
                <p className="entity-card__meta">
                  Última visita:{' '}
                  {client.lastVisit
                    ? new Date(client.lastVisit).toLocaleDateString('pt-BR')
                    : '—'}
                </p>
              </div>
            </div>
            <div className="entity-card__row">
              <PhoneIcon /> {formatBrPhone(client.phone)}
              {client.phoneIsWhatsapp ? (
                <span className="chip chip--ok">WhatsApp</span>
              ) : null}
            </div>
            {client.prefersMessageContact ? (
              <div className="entity-card__row">
                <MsgIcon /> Prefere atendimento por mensagem
              </div>
            ) : null}
            <div className="entity-card__foot">
              <span>Total gasto</span>
              <strong>{formatCurrency(client.totalSpent ?? 0)}</strong>
            </div>
            <div className="modal__actions" style={{ marginTop: 0 }}>
              {client.phoneIsWhatsapp ? (
                <Link
                  className="btn btn--soft"
                  to={`/app/comunicacoes?clientId=${client.id}`}
                >
                  Mensagem
                </Link>
              ) : null}
              <button type="button" className="btn btn--ghost" onClick={() => openEdit(client)}>
                Editar
              </button>
                  <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  if (
                    !window.confirm(
                      'Excluir este cliente? Agendamentos vinculados também serão removidos.',
                    )
                  ) {
                    return;
                  }
                  void api.clients
                    .remove(client.id)
                    .then(() => {
                      setError(null);
                      return load();
                    })
                    .catch((err) => {
                      setError(
                        err instanceof Error
                          ? err.message
                          : 'Erro ao excluir cliente',
                      );
                    });
                }}
              >
                Excluir
              </button>
            </div>
          </article>
        ))}
      </section>

      {!items.length ? <p className="empty">Nenhum cliente encontrado.</p> : null}

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Editar cliente' : 'Nova cliente'}</h3>
            {formError ? <div className="error-banner">{formError}</div> : null}
            <form className="form-grid" onSubmit={onSubmit} noValidate>
              <Field label="Nome">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={120}
                  required
                  autoComplete="name"
                />
              </Field>
              <div className="form-grid form-grid--2">
                <Field label="Telefone / celular">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(formatBrPhone(e.target.value))}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 98765-4321"
                    required
                  />
                </Field>
                <Field label="E-mail (opcional / interno)">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="Não usado para contato"
                  />
                </Field>
              </div>

              <p className="msg-lead" style={{ margin: 0 }}>
                O contato com o cliente é feito pela aba{' '}
                <Link to="/app/comunicacoes">Comunicações</Link> via WhatsApp do
                salão.
              </p>

              <div className="check-list">
                <label className="check-row">
                  <span>Este número é WhatsApp</span>
                  <input
                    type="checkbox"
                    checked={phoneIsWhatsapp}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPhoneIsWhatsapp(checked);
                      if (!checked) setPrefersMessageContact(false);
                    }}
                  />
                </label>
                <label className="check-row">
                  <span>Prefere atendimento via mensagem</span>
                  <input
                    type="checkbox"
                    checked={prefersMessageContact}
                    disabled={!phoneIsWhatsapp}
                    onChange={(e) => setPrefersMessageContact(e.target.checked)}
                    title={
                      phoneIsWhatsapp
                        ? undefined
                        : 'Marque primeiro que o número é WhatsApp'
                    }
                  />
                </label>
              </div>

              <Field label="Observações">
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                />
              </Field>
              <div className="modal__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h3l2 5-2 1a12 12 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z" />
    </svg>
  );
}
function MsgIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5h16v10H8l-4 4V5z" />
    </svg>
  );
}

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, type Professional } from '../lib/api';
import { initials } from '../lib/format';
import {
  formatBrPhone,
  isValidBrPhone,
  isValidEmail,
  phoneDigits,
} from '../lib/phone';

export function ProfessionalsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [items, setItems] = useState<Professional[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setItems(await api.professionals.list());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao listar profissionais');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setName('');
    setEmail('');
    setPhone('');
    setTitle('');
    setPassword('');
    setFormError(null);
    setOpen(true);
  }

  function openEdit(pro: Professional) {
    setEditing(pro);
    setName(pro.name);
    setEmail(pro.email);
    setPhone(pro.phone ? formatBrPhone(pro.phone) : '');
    setTitle(pro.title ?? '');
    setPassword('');
    setFormError(null);
    setOpen(true);
  }

  function validateForm(): string | null {
    if (name.trim().length < 2) {
      return 'O nome deve ter pelo menos 2 caracteres.';
    }
    if (!isValidEmail(email) || !email.trim()) {
      return 'E-mail inválido.';
    }
    if (phone.trim() && !isValidBrPhone(phone)) {
      return 'Telefone inválido. Use DDD + número (ex.: (11) 98765-4321).';
    }
    if (!editing && password.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (editing && password && password.length < 6) {
      return 'A nova senha deve ter pelo menos 6 caracteres.';
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
    try {
      const phoneValue = phone.trim() ? phoneDigits(phone) : '';
      if (editing) {
        await api.professionals.update(editing.id, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phoneValue,
          title: title.trim(),
          ...(password ? { password } : {}),
        });
      } else {
        await api.professionals.create({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phoneValue,
          title: title.trim(),
          password,
          role: 'PROFESSIONAL',
        });
      }
      setOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar profissional');
    } finally {
      setSaving(false);
    }
  }

  async function removePro(id: string) {
    if (
      !window.confirm(
        'Excluir este profissional? Agendamentos vinculados também serão removidos.',
      )
    ) {
      return;
    }
    try {
      await api.professionals.remove(id);
      setError(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir profissional');
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Profissionais</h1>
          <p>Equipe do salão e sua performance.</p>
        </div>
        {isAdmin ? (
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            + Novo profissional
          </button>
        ) : null}
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="pro-grid">
        {items.map((pro) => (
          <article key={pro.id} className="pro-card">
            <div className="avatar">{initials(pro.name)}</div>
            <div className="pro-card__info">
              <h3>{pro.name}</h3>
              <p className="pro-card__role">{pro.title || 'Profissional'}</p>
              <div className="entity-card__row">
                <PhoneIcon /> {pro.phone ? formatBrPhone(pro.phone) : 'Sem telefone'}
              </div>
              {isAdmin ? (
                <div className="modal__actions" style={{ marginTop: '0.7rem' }}>
                  <button type="button" className="btn btn--ghost" onClick={() => openEdit(pro)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={() => void removePro(pro.id)}
                  >
                    Excluir
                  </button>
                </div>
              ) : null}
            </div>
            <div className="pro-card__metric">
              <strong>{pro.monthlyAppointments ?? 0}</strong>
              <span>atendimentos/mês</span>
            </div>
          </article>
        ))}
      </section>

      {!items.length ? <p className="empty">Nenhum profissional cadastrado.</p> : null}

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Editar profissional' : 'Novo profissional'}</h3>
            {formError ? <div className="error-banner">{formError}</div> : null}
            <form className="form-grid" onSubmit={onSubmit} noValidate>
              <Field label="Nome">
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Função">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Barbeiro, Colorista"
                />
              </Field>
              <Field label="E-mail">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Telefone">
                <input
                  value={phone}
                  onChange={(e) => setPhone(formatBrPhone(e.target.value))}
                  inputMode="tel"
                  placeholder="(11) 98765-4321"
                />
              </Field>
              <Field label={editing ? 'Nova senha (opcional)' : 'Senha'}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editing}
                  minLength={6}
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

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h3l2 5-2 1a12 12 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z" />
    </svg>
  );
}

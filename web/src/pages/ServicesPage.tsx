import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, type Service } from '../lib/api';
import { formatCurrency } from '../lib/format';

export function ServicesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [items, setItems] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Cabelo');
  const [price, setPrice] = useState('100');
  const [duration, setDuration] = useState('60');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setItems(await api.services.list());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao listar serviços');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const service of items) {
      const key = service.category || 'Geral';
      const list = map.get(key) ?? [];
      list.push(service);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [items]);

  function openCreate() {
    setEditing(null);
    setName('');
    setDescription('');
    setCategory('Cabelo');
    setPrice('100');
    setDuration('60');
    setFormError(null);
    setOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setName(service.name);
    setDescription(service.description ?? '');
    setCategory(service.category || 'Geral');
    setPrice(String(service.price));
    setDuration(String(service.durationInMinutes));
    setFormError(null);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category,
        price: Number(price),
        durationInMinutes: Number(duration),
      };
      if (editing) await api.services.update(editing.id, payload);
      else await api.services.create(payload);
      setOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar serviço');
    } finally {
      setSaving(false);
    }
  }

  async function removeService(id: string) {
    if (
      !window.confirm(
        'Excluir este serviço? Agendamentos vinculados também serão removidos.',
      )
    ) {
      return;
    }
    try {
      await api.services.remove(id);
      setError(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir serviço');
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Serviços</h1>
          <p>Catálogo do salão e da barbearia.</p>
        </div>
        {isAdmin ? (
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            + Novo serviço
          </button>
        ) : null}
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      {grouped.map(([group, services]) => (
        <section key={group} className="service-section">
          <h2>{group}</h2>
          <div className="service-grid">
            {services.map((service) => (
              <article key={service.id} className="service-card">
                <div className="service-card__top">
                  <h3>{service.name}</h3>
                  <span className="service-card__price">
                    {formatCurrency(service.price)}
                  </span>
                </div>
                <div className="service-card__duration">
                  <ClockIcon /> {service.durationInMinutes} min
                </div>
                {isAdmin ? (
                  <div className="modal__actions" style={{ marginTop: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => openEdit(service)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => void removeService(service.id)}
                    >
                      Excluir
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}

      {!items.length ? <p className="empty">Nenhum serviço cadastrado.</p> : null}

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Editar serviço' : 'Novo serviço'}</h3>
            {formError ? <div className="error-banner">{formError}</div> : null}
            <form className="form-grid" onSubmit={onSubmit}>
              <Field label="Nome">
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Categoria">
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option>Cabelo</option>
                  <option>Tratamento</option>
                  <option>Unhas</option>
                  <option>Estética</option>
                  <option>Barbearia</option>
                  <option>Geral</option>
                </select>
              </Field>
              <Field label="Descrição">
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
              <div className="form-grid form-grid--2">
                <Field label="Preço (R$)">
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Duração (min)">
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                  />
                </Field>
              </div>
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

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}

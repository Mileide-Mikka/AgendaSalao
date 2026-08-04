import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  api,
  type AppointmentStatus,
  type Client,
  type Professional,
  type Service,
} from '../../lib/api';
import { localInputToIso, toLocalInputValue } from '../../lib/format';
import {
  readLocalSalonSettings,
  resolveHoursForDate,
  settingsFromApi,
  validateAppointmentBusinessHours,
  writeLocalSalonSettings,
  type SalonBusinessSettings,
} from '../../lib/salonSettings';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialDate?: string;
};

export function AppointmentModal({ open, onClose, onCreated, initialDate }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientId, setClientId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [startTime, setStartTime] = useState(toLocalInputValue());
  const [status, setStatus] = useState<AppointmentStatus>('CONFIRMED');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SalonBusinessSettings>(() =>
    readLocalSalonSettings(),
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);
    void Promise.all([
      api.clients.list(),
      api.professionals.list(),
      api.services.list(),
      api.business.getSettings().catch(() => null),
    ])
      .then(([c, p, s, biz]) => {
        setClients(c);
        setProfessionals(p);
        setServices(s);
        setClientId(c[0]?.id ?? '');
        setProfessionalId(p[0]?.id ?? '');
        setServiceId(s[0]?.id ?? '');
        let hoursCfg = readLocalSalonSettings();
        if (biz) {
          hoursCfg = settingsFromApi(biz);
          writeLocalSalonSettings(hoursCfg);
        }
        setSettings(hoursCfg);
        if (initialDate) {
          const probe = new Date(`${initialDate}T12:00:00`);
          const dayHours = resolveHoursForDate(probe, hoursCfg);
          setStartTime(
            `${initialDate}T${dayHours.open ? dayHours.openTime : '09:00'}`,
          );
        } else {
          setStartTime(toLocalInputValue());
        }
        if (!c.length || !p.length || !s.length) {
          setError(
            'Cadastre ao menos 1 cliente, 1 profissional e 1 serviço antes de agendar.',
          );
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados do agendamento');
      })
      .finally(() => setLoading(false));
  }, [open, initialDate]);

  if (!open) return null;

  const catalogReady =
    clients.length > 0 && professionals.length > 0 && services.length > 0;
  const selectedService = services.find((s) => s.id === serviceId);
  const duration = selectedService?.durationInMinutes ?? 60;

  let previewHours = resolveHoursForDate(new Date(), settings);
  try {
    if (startTime) {
      previewHours = resolveHoursForDate(
        new Date(localInputToIso(startTime)),
        settings,
      );
    }
  } catch {
    /* invalid while typing */
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!catalogReady || !clientId || !professionalId || !serviceId) {
      setError(
        'Cadastre ao menos 1 cliente, 1 profissional e 1 serviço antes de agendar.',
      );
      return;
    }

    let iso: string;
    try {
      iso = localInputToIso(startTime);
    } catch {
      setError('Data/horário inválido.');
      return;
    }

    const hoursError = validateAppointmentBusinessHours(
      new Date(iso),
      duration,
      settings,
    );
    if (hoursError) {
      setError(hoursError);
      return;
    }

    setSaving(true);
    try {
      await api.appointments.create({
        clientId,
        professionalId,
        serviceId,
        startTime: iso,
        status,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-appt-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="new-appt-title">Novo agendamento</h3>
        <p className="msg-lead" style={{ marginTop: '-0.35rem' }}>
          {previewHours.open ? (
            <>
              Funcionamento ({previewHours.dayLabel.toLowerCase()}):{' '}
              <strong>{previewHours.openTime}</strong> às{' '}
              <strong>{previewHours.closeTime}</strong>
            </>
          ) : (
            <>
              <strong>Fechado</strong> {previewHours.dayLabel.toLowerCase()} —
              escolha outro dia.
            </>
          )}
        </p>
        {error ? <div className="error-banner">{error}</div> : null}
        {loading ? <p className="empty">Carregando…</p> : null}
        <form className="form-grid" onSubmit={onSubmit}>
          <Field label="Cliente">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              disabled={!clients.length}
            >
              {!clients.length ? <option value="">Nenhum cliente</option> : null}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-grid form-grid--2">
            <Field label="Profissional">
              <select
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                required
                disabled={!professionals.length}
              >
                {!professionals.length ? (
                  <option value="">Nenhum profissional</option>
                ) : null}
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Serviço">
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
                disabled={!services.length}
              >
                {!services.length ? <option value="">Nenhum serviço</option> : null}
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationInMinutes} min)
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="form-grid form-grid--2">
            <Field label="Horário">
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
              >
                <option value="CONFIRMED">Confirmado</option>
                <option value="PENDING">Pendente</option>
              </select>
            </Field>
          </div>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={saving || loading || !catalogReady}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
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

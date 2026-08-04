import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AppointmentModal } from '../components/appointments/AppointmentModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { api, type Appointment, type DashboardSummary } from '../lib/api';
import {
  formatCurrency,
  formatTime,
  greetingForNow,
  statusClass,
  statusDisplayLabel,
} from '../lib/format';

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function load() {
    try {
      setData(await api.dashboard());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar painel');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const firstName = user?.name.split(' ')[0] ?? 'equipe';

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.appointments.updateStatus(cancelTarget.id, 'CANCELLED');
      setCancelTarget(null);
      setError(null);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao cancelar agendamento',
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>
            {greetingForNow()}, {firstName}
          </h1>
          <p>Aqui está o resumo do seu salão hoje.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)}>
          + Novo agendamento
        </button>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="stats" aria-label="Indicadores">
        <article className="stat-card">
          <div className="stat-card__icon" aria-hidden>
            <CalIcon />
          </div>
          <p className="stat-card__label">Agendamentos hoje</p>
          <p className="stat-card__value">{data?.appointmentsToday ?? '—'}</p>
          <p className="stat-card__meta">
            {data?.confirmedToday ?? 0} confirmados
            {(data?.waitingToday ?? 0) > 0
              ? ` · ${data?.waitingToday} aguardando`
              : ''}
          </p>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon" aria-hidden>
            <MoneyIcon />
          </div>
          <p className="stat-card__label">Receita prevista</p>
          <p className="stat-card__value">
            {data ? formatCurrency(data.expectedRevenue) : '—'}
          </p>
          <p className="stat-card__meta">Somente confirmados e realizados</p>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon" aria-hidden>
            <UsersIcon />
          </div>
          <p className="stat-card__label">Clientes ativos</p>
          <p className="stat-card__value">{data?.activeClients ?? '—'}</p>
          <p className="stat-card__meta">
            +{data?.newClientsLast30Days ?? 0} nos últimos 30 dias
          </p>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon" aria-hidden>
            <ClockIcon />
          </div>
          <p className="stat-card__label">Próximo horário</p>
          <p className="stat-card__value">
            {data?.nextAppointment ? formatTime(data.nextAppointment.time) : '—'}
          </p>
          <p className="stat-card__meta">
            {data?.nextAppointment?.clientName ?? 'Sem próximos horários'}
          </p>
        </article>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Agenda de hoje</h2>
          <Link to="/app/agenda" className="btn btn--ghost">
            Ver todos
          </Link>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Horário</th>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Profissional</th>
                <th>Valor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(data?.todayAgenda ?? []).map((item) => (
                <tr key={item.id}>
                  <td>{formatTime(item.startTime)}</td>
                  <td>{item.client.name}</td>
                  <td>{item.service.name}</td>
                  <td>{item.professional.name}</td>
                  <td>{formatCurrency(item.service.price)}</td>
                  <td>
                    <span className={statusClass(item.status)}>
                      {statusDisplayLabel(item.status)}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      {item.status === 'PENDING' || item.status === 'CONFIRMED' ? (
                        <button
                          type="button"
                          className="btn btn--soft"
                          onClick={() =>
                            void api.appointments
                              .updateStatus(item.id, 'WAITING')
                              .then(load)
                              .catch((err) =>
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : 'Erro ao marcar chegada',
                                ),
                              )
                          }
                        >
                          Chegou
                        </button>
                      ) : null}
                      {item.status === 'WAITING' ||
                      item.status === 'PENDING' ||
                      item.status === 'CONFIRMED' ? (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() =>
                            void api.appointments
                              .updateStatus(item.id, 'COMPLETED')
                              .then(load)
                              .catch((err) =>
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : 'Erro ao concluir',
                                ),
                              )
                          }
                        >
                          Concluir
                        </button>
                      ) : null}
                      {item.status === 'PENDING' ||
                      item.status === 'CONFIRMED' ||
                      item.status === 'WAITING' ? (
                        <button
                          type="button"
                          className="btn btn--danger"
                          onClick={() => setCancelTarget(item)}
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!data?.todayAgenda?.length ? (
                <tr>
                  <td colSpan={7} className="empty">
                    Nenhum agendamento para hoje.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <AppointmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => void load()}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancelar agendamento?"
        tone="danger"
        confirmLabel="Sim, cancelar"
        cancelLabel="Manter horário"
        loading={cancelling}
        onClose={() => {
          if (!cancelling) setCancelTarget(null);
        }}
        onConfirm={() => void confirmCancel()}
        description={
          cancelTarget ? (
            <>
              <p>
                O horário será liberado na agenda do profissional. Confirme só se o
                cliente ou o salão desistiu do atendimento.
              </p>
              <div className="confirm-modal__meta">
                <strong>{cancelTarget.client.name}</strong>
                <span>
                  {formatTime(cancelTarget.startTime)} · {cancelTarget.service.name} ·{' '}
                  {cancelTarget.professional.name}
                </span>
              </div>
            </>
          ) : null
        }
      />
    </>
  );
}

function CalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
function MoneyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v10M9.5 9.5c.6-1 1.5-1.5 2.5-1.5s2 .6 2 1.7-1 1.6-2.5 2-2.5.9-2.5 2.1 1.1 1.7 2.5 1.7 2-.6 2.5-1.5" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.8-3 2.8-4.5 5.5-4.5S13.7 16 14.5 19" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}

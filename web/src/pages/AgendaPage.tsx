import { useEffect, useMemo, useState } from 'react';
import { AppointmentModal } from '../components/appointments/AppointmentModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { api, type Appointment, type AppointmentStatus } from '../lib/api';
import {
  formatCurrency,
  formatDateKey,
  formatTime,
  monthLabel,
  statusClass,
  statusDisplayLabel,
} from '../lib/format';

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const STATUS_FILTERS: Array<{ id: 'ALL' | AppointmentStatus; label: string }> = [
  { id: 'ALL', label: 'Todos' },
  { id: 'CONFIRMED', label: 'Confirmado' },
  { id: 'PENDING', label: 'Pendente' },
  { id: 'WAITING', label: 'Aguardando' },
  { id: 'COMPLETED', label: 'Concluído' },
  { id: 'CANCELLED', label: 'Cancelado' },
];

export function AgendaPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(() => formatDateKey(new Date()));
  const [items, setItems] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AppointmentStatus>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<'calendar' | 'list'>('list');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);

  const range = useMemo(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    return { from: formatDateKey(from), to: formatDateKey(to) };
  }, [cursor]);

  async function load() {
    try {
      setItems(await api.appointments.agenda(range));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar agenda');
    }
  }

  useEffect(() => {
    void load();
  }, [range.from, range.to]);

  async function setStatus(id: string, status: AppointmentStatus) {
    setBusyId(id);
    try {
      await api.appointments.updateStatus(id, status);
      setError(null);
      if (status === 'CANCELLED') setCancelTarget(null);
      await load();
    } catch (err) {
      const fallback =
        status === 'CANCELLED'
          ? 'Erro ao cancelar agendamento'
          : status === 'COMPLETED'
            ? 'Erro ao concluir agendamento'
            : 'Erro ao atualizar status do agendamento';
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const statusOk = statusFilter === 'ALL' || item.status === statusFilter;
      const searchOk =
        !q ||
        item.client.name.toLowerCase().includes(q) ||
        item.service.name.toLowerCase().includes(q);
      return statusOk && searchOk;
    });
  }, [items, search, statusFilter]);

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const item of items) {
      const key = formatDateKey(new Date(item.startTime));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const days = useMemo(() => buildCalendarDays(cursor), [cursor]);
  const selectedItems = (byDay.get(selected) ?? []).filter((item) => {
    const q = search.trim().toLowerCase();
    const statusOk = statusFilter === 'ALL' || item.status === statusFilter;
    const searchOk =
      !q ||
      item.client.name.toLowerCase().includes(q) ||
      item.service.name.toLowerCase().includes(q);
    return statusOk && searchOk;
  });

  const waitingCount = items.filter((i) => i.status === 'WAITING').length;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Agendamentos</h1>
          <p>
            Lista completa da agenda do salão
            {waitingCount > 0
              ? ` · ${waitingCount} cliente${waitingCount > 1 ? 's' : ''} aguardando`
              : ''}
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)}>
          + Novo agendamento
        </button>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="toolbar">
        <label className="search">
          <SearchIcon />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou serviço..."
          />
        </label>
        <div className="filters" role="tablist" aria-label="Status">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={statusFilter === filter.id ? 'is-active' : ''}
              onClick={() => setStatusFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn--soft"
          onClick={() => setView((v) => (v === 'list' ? 'calendar' : 'list'))}
        >
          {view === 'list' ? 'Ver calendário' : 'Ver lista'}
        </button>
      </div>

      {view === 'calendar' ? (
        <>
          <section className="panel calendar">
            <div className="calendar__nav">
              <button
                type="button"
                className="btn btn--soft"
                onClick={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
                }
              >
                ←
              </button>
              <h2>{monthLabel(cursor)}</h2>
              <button
                type="button"
                className="btn btn--soft"
                onClick={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
                }
              >
                →
              </button>
            </div>
            <div className="calendar__grid">
              {DOW.map((d) => (
                <div key={d} className="calendar__dow">
                  {d}
                </div>
              ))}
              {days.map((day) => {
                const key = formatDateKey(day.date);
                const count = byDay.get(key)?.length ?? 0;
                const isToday = key === formatDateKey(new Date());
                return (
                  <button
                    key={key + String(day.inMonth)}
                    type="button"
                    className={`calendar__day${day.inMonth ? '' : ' is-muted'}${
                      isToday ? ' is-today' : ''
                    }${selected === key ? ' is-selected' : ''}`}
                    onClick={() => setSelected(key)}
                  >
                    <span className="calendar__day-num">{day.date.getDate()}</span>
                    {count > 0 ? (
                      <>
                        <span className="calendar__dots">
                          {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                            <span key={i} className="calendar__dot" />
                          ))}
                        </span>
                        <span className="calendar__count">{count} agend.</span>
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel" style={{ marginTop: '1rem' }}>
            <div className="panel__head">
              <h2>
                {new Date(selected + 'T12:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                })}
              </h2>
            </div>
            <AgendaTable
              items={selectedItems}
              busyId={busyId}
              onMarkArrived={(id) => void setStatus(id, 'WAITING')}
              onComplete={(id) => void setStatus(id, 'COMPLETED')}
              onRequestCancel={setCancelTarget}
            />
          </section>
        </>
      ) : (
        <section className="panel">
          <AgendaTable
            items={filtered}
            showDate
            busyId={busyId}
            onMarkArrived={(id) => void setStatus(id, 'WAITING')}
            onComplete={(id) => void setStatus(id, 'COMPLETED')}
            onRequestCancel={setCancelTarget}
          />
        </section>
      )}

      <AppointmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => void load()}
        initialDate={selected}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancelar agendamento?"
        tone="danger"
        confirmLabel="Sim, cancelar"
        cancelLabel="Manter horário"
        loading={Boolean(cancelTarget && busyId === cancelTarget.id)}
        onClose={() => {
          if (!busyId) setCancelTarget(null);
        }}
        onConfirm={() => {
          if (cancelTarget) void setStatus(cancelTarget.id, 'CANCELLED');
        }}
        description={
          cancelTarget ? (
            <>
              <p>
                O horário será liberado na agenda do profissional. Esta ação não pode ser
                desfeita de forma automática.
              </p>
              <div className="confirm-modal__meta">
                <strong>{cancelTarget.client.name}</strong>
                <span>
                  {formatTime(cancelTarget.startTime)} · {cancelTarget.service.name} ·{' '}
                  {cancelTarget.professional.name}
                </span>
                <span>
                  {new Date(cancelTarget.startTime).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                </span>
              </div>
            </>
          ) : null
        }
      />
    </>
  );
}

function AgendaTable({
  items,
  showDate,
  busyId,
  onMarkArrived,
  onComplete,
  onRequestCancel,
}: {
  items: Appointment[];
  showDate?: boolean;
  busyId: string | null;
  onMarkArrived: (id: string) => void;
  onComplete: (id: string) => void;
  onRequestCancel: (item: Appointment) => void;
}) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {showDate ? <th>Data</th> : null}
            <th>Hora</th>
            <th>Cliente</th>
            <th>Serviço</th>
            <th>Profissional</th>
            <th>Valor</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const canArrive =
              item.status === 'PENDING' || item.status === 'CONFIRMED';
            const canComplete =
              item.status === 'PENDING' ||
              item.status === 'CONFIRMED' ||
              item.status === 'WAITING';
            const canCancel =
              item.status === 'PENDING' ||
              item.status === 'CONFIRMED' ||
              item.status === 'WAITING';
            const busy = busyId === item.id;
            return (
              <tr key={item.id}>
                {showDate ? (
                  <td>{new Date(item.startTime).toLocaleDateString('pt-BR')}</td>
                ) : null}
                <td>{formatTime(item.startTime)}</td>
                <td>{item.client.name}</td>
                <td>{item.service.name}</td>
                <td>{item.professional.name}</td>
                <td>{formatCurrency(item.service.price)}</td>
                <td>
                  <span
                    className={statusClass(item.status)}
                    title={statusDisplayLabel(item.status)}
                  >
                    {statusDisplayLabel(item.status)}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    {canArrive ? (
                      <button
                        type="button"
                        className="btn btn--soft"
                        disabled={busy}
                        onClick={() => onMarkArrived(item.id)}
                      >
                        {busy ? '…' : 'Cliente chegou'}
                      </button>
                    ) : null}
                    {canComplete ? (
                      <button
                        type="button"
                        className="btn btn--ghost"
                        disabled={busy}
                        onClick={() => onComplete(item.id)}
                      >
                        {busy ? '…' : 'Concluir'}
                      </button>
                    ) : null}
                    {canCancel ? (
                      <button
                        type="button"
                        className="btn btn--danger"
                        disabled={busy}
                        onClick={() => onRequestCancel(item)}
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
          {!items.length ? (
            <tr>
              <td colSpan={showDate ? 8 : 7} className="empty">
                Nenhum agendamento encontrado.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function buildCalendarDays(monthCursor: Date) {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return { date, inMonth: date.getMonth() === month };
  });
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

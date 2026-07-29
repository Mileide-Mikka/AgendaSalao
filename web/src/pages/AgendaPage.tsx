import { useEffect, useMemo, useState } from 'react';
import { AppointmentModal } from '../components/appointments/AppointmentModal';
import { api, type Appointment, type AppointmentStatus } from '../lib/api';
import {
  formatCurrency,
  formatDateKey,
  formatTime,
  monthLabel,
  statusClass,
  statusLabel,
} from '../lib/format';

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const STATUS_FILTERS: Array<{ id: 'ALL' | AppointmentStatus; label: string }> = [
  { id: 'ALL', label: 'Todos' },
  { id: 'CONFIRMED', label: 'Confirmado' },
  { id: 'PENDING', label: 'Pendente' },
  { id: 'COMPLETED', label: 'Concluido' },
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

  async function completeAppointment(id: string) {
    try {
      await api.appointments.updateStatus(id, 'COMPLETED');
      setError(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao concluir agendamento');
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

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Agendamentos</h1>
          <p>Lista completa da agenda do salão</p>
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
              onComplete={(id) => void completeAppointment(id)}
            />
          </section>
        </>
      ) : (
        <section className="panel">
          <AgendaTable
            items={filtered}
            showDate
            onComplete={(id) => void completeAppointment(id)}
          />
        </section>
      )}

      <AppointmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => void load()}
        initialDate={selected}
      />
    </>
  );
}

function AgendaTable({
  items,
  showDate,
  onComplete,
}: {
  items: Appointment[];
  showDate?: boolean;
  onComplete: (id: string) => void;
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
          {items.map((item) => (
            <tr key={item.id}>
              {showDate ? (
                <td>
                  {new Date(item.startTime).toLocaleDateString('pt-BR')}
                </td>
              ) : null}
              <td>{formatTime(item.startTime)}</td>
              <td>{item.client.name}</td>
              <td>{item.service.name}</td>
              <td>{item.professional.name}</td>
              <td>{formatCurrency(item.service.price)}</td>
              <td>
                <span className={statusClass(item.status)}>
                  {statusLabel(item.status)}
                </span>
              </td>
              <td>
                {item.status !== 'COMPLETED' && item.status !== 'CANCELLED' ? (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => onComplete(item.id)}
                  >
                    Concluir
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
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

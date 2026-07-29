import type { AppointmentStatus } from './api';

export function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function formatCurrency(value: string | number) {
  const amount = typeof value === 'string' ? Number(value) : value;
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function statusLabel(status: AppointmentStatus) {
  switch (status) {
    case 'CONFIRMED':
      return 'confirmado';
    case 'PENDING':
      return 'pendente';
    case 'COMPLETED':
      return 'concluido';
    case 'CANCELLED':
      return 'cancelado';
  }
}

export function statusClass(status: AppointmentStatus) {
  return `badge badge--${statusLabel(status)}`;
}

export function monthLabel(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

export function toLocalInputValue(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localInputToIso(value: string) {
  return new Date(value).toISOString();
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

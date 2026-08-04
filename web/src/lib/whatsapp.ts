import { formatBrPhone, phoneDigits } from './phone';

export const WHATSAPP_STORAGE_KEY = 'belle-whatsapp-connection';

export type WhatsAppConnection = {
  phone: string;
  label: string;
  connected: boolean;
  connectedAt?: string;
};

const defaults: WhatsAppConnection = {
  phone: '',
  label: '',
  connected: false,
};

export function readWhatsAppConnection(): WhatsAppConnection {
  try {
    const raw = localStorage.getItem(WHATSAPP_STORAGE_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveWhatsAppConnection(data: WhatsAppConnection) {
  localStorage.setItem(WHATSAPP_STORAGE_KEY, JSON.stringify(data));
}

/** Brazil number with country code (55…), digits only. */
export function toWhatsAppE164(phone: string): string {
  const digits = phoneDigits(phone);
  return digits.startsWith('55') ? digits : `55${digits}`;
}

/**
 * WhatsApp Web (gratuito): abre web.whatsapp.com com chat e texto prontos.
 * Exige o usuário logado no WhatsApp Web no navegador.
 * Fallback wa.me se preferir app/redirect genérico.
 */
export function buildWhatsAppWebLink(phone: string, message?: string): string {
  const withCountry = toWhatsAppE164(phone);
  const params = new URLSearchParams({ phone: withCountry });
  if (message?.trim()) params.set('text', message.trim());
  return `https://web.whatsapp.com/send?${params.toString()}`;
}

/** Link genérico (app no celular / redirect). */
export function buildWhatsAppLink(phone: string, message?: string): string {
  const withCountry = toWhatsAppE164(phone);
  const base = `https://wa.me/${withCountry}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function openWhatsAppWeb(phone: string, message?: string) {
  window.open(buildWhatsAppWebLink(phone, message), '_blank', 'noopener,noreferrer');
}

export function openWhatsApp(phone: string, message?: string) {
  openWhatsAppWeb(phone, message);
}

export type MessageTemplate = {
  id: string;
  title: string;
  body: string;
};

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'reminder',
    title: 'Lembrete de agendamento',
    body: 'Olá, {nome}! Passando para lembrar do seu horário no {salao}. Qualquer dúvida, é só responder por aqui ✂️',
  },
  {
    id: 'confirm',
    title: 'Confirmar presença',
    body: 'Oi, {nome}! Pode confirmar se vem no horário marcado? Agradecemos a resposta 💛',
  },
  {
    id: 'thanks',
    title: 'Agradecimento',
    body: 'Obrigado pela visita, {nome}! Foi um prazer atender você no {salao}. Até a próxima!',
  },
  {
    id: 'promo',
    title: 'Novidade / promoção',
    body: 'Oi, {nome}! Temos novidades no {salao}. Quer que eu te conte os horários disponíveis?',
  },
];

export function applyTemplate(
  template: string,
  vars: { nome: string; salao: string },
): string {
  return template
    .replaceAll('{nome}', vars.nome)
    .replaceAll('{salao}', vars.salao);
}

export function formatSalonWhatsApp(phone: string): string {
  return formatBrPhone(phone);
}

/** Local “rascunhos enviados” for the chat-style inbox (not delivery confirmation). */
export const MESSAGE_LOG_KEY = 'belle-message-log';
export const MESSAGE_LOG_EVENT = 'belle-message-log-changed';
const MESSAGE_LOG_CHANNEL = 'belle-message-log';

export type LocalMessage = {
  id: string;
  clientId: string;
  clientName: string;
  phone: string;
  body: string;
  createdAt: string;
  status: 'opened';
};

function notifyMessageLogChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(MESSAGE_LOG_EVENT));
  try {
    const bc = new BroadcastChannel(MESSAGE_LOG_CHANNEL);
    bc.postMessage({ type: 'message-log-changed', at: Date.now() });
    bc.close();
  } catch {
    /* BroadcastChannel unsupported */
  }
}

export function readMessageLog(): LocalMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGE_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendMessageLog(entry: Omit<LocalMessage, 'id' | 'createdAt' | 'status'>) {
  const next: LocalMessage = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    status: 'opened',
  };
  const all = [next, ...readMessageLog()].slice(0, 200);
  localStorage.setItem(MESSAGE_LOG_KEY, JSON.stringify(all));
  notifyMessageLogChanged();
  return next;
}

export function messagesForClient(
  clientId: string,
  log: LocalMessage[] = readMessageLog(),
): LocalMessage[] {
  return log
    .filter((m) => m.clientId === clientId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Subscribe to log changes (same tab, other tabs, storage). */
export function subscribeMessageLog(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onStorage = (e: StorageEvent) => {
    if (e.key === MESSAGE_LOG_KEY || e.key === null) onChange();
  };
  const onLocal = () => onChange();

  window.addEventListener('storage', onStorage);
  window.addEventListener(MESSAGE_LOG_EVENT, onLocal);

  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(MESSAGE_LOG_CHANNEL);
    bc.onmessage = () => onChange();
  } catch {
    bc = null;
  }

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(MESSAGE_LOG_EVENT, onLocal);
    bc?.close();
  };
}


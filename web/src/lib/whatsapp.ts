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

/** Build wa.me URL for Brazil (+55). */
export function buildWhatsAppLink(phone: string, message?: string): string {
  const digits = phoneDigits(phone);
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  const base = `https://wa.me/${withCountry}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function openWhatsApp(phone: string, message?: string) {
  const url = buildWhatsAppLink(phone, message);
  window.open(url, '_blank', 'noopener,noreferrer');
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

import {
  formatMinutesAsHm,
  legacyFieldsFromWeekly,
  normalizeWeeklyHours,
  parseHmToMinutes,
  resolveHoursForDate,
  salonClockMinutes,
  type DaySchedule,
  type SalonHoursConfig,
  type WeekdayKey,
  type WeeklyHours,
} from './formatSalonHours';

export type {
  DaySchedule,
  SalonHoursConfig,
  WeekdayKey,
  WeeklyHours,
};

export {
  WEEKDAY_LABELS,
  WEEKDAY_UI_ORDER,
  defaultWeeklyHours,
  normalizeWeeklyHours,
  resolveHoursForDate,
} from './formatSalonHours';

export type SalonBusinessSettings = {
  name: string;
  address: string;
  openTime: string;
  closeTime: string;
  saturdayOpenTime: string;
  saturdayCloseTime: string;
  weeklyHours: WeeklyHours;
  whatsappReminder: boolean;
  cancelAlerts: boolean;
};

export const SALON_SETTINGS_STORAGE_KEY = 'belle-salon-settings';

export const DEFAULT_SALON_SETTINGS: SalonBusinessSettings = (() => {
  const weeklyHours = normalizeWeeklyHours(null, {
    openTime: '09:00',
    closeTime: '19:00',
    saturdayOpenTime: '09:00',
    saturdayCloseTime: '20:00',
  });
  const legacy = legacyFieldsFromWeekly(weeklyHours);
  return {
    name: 'Belle Salão & Barbearia',
    address: '',
    ...legacy,
    weeklyHours,
    whatsappReminder: true,
    cancelAlerts: false,
  };
})();

export function readLocalSalonSettings(): SalonBusinessSettings {
  try {
    const raw = localStorage.getItem(SALON_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SALON_SETTINGS, weeklyHours: { ...DEFAULT_SALON_SETTINGS.weeklyHours } };
    const parsed = JSON.parse(raw) as Partial<SalonBusinessSettings>;
    const weeklyHours = normalizeWeeklyHours(parsed.weeklyHours, {
      openTime: parsed.openTime,
      closeTime: parsed.closeTime,
      saturdayOpenTime: parsed.saturdayOpenTime,
      saturdayCloseTime: parsed.saturdayCloseTime,
    });
    const legacy = legacyFieldsFromWeekly(weeklyHours);
    return {
      ...DEFAULT_SALON_SETTINGS,
      ...parsed,
      ...legacy,
      weeklyHours,
    };
  } catch {
    return {
      ...DEFAULT_SALON_SETTINGS,
      weeklyHours: normalizeWeeklyHours(null),
    };
  }
}

export function writeLocalSalonSettings(settings: SalonBusinessSettings) {
  const weeklyHours = normalizeWeeklyHours(settings.weeklyHours, settings);
  const legacy = legacyFieldsFromWeekly(weeklyHours);
  localStorage.setItem(
    SALON_SETTINGS_STORAGE_KEY,
    JSON.stringify({ ...settings, ...legacy, weeklyHours }),
  );
}

export function settingsFromApi(biz: {
  name: string;
  address: string;
  openTime: string;
  closeTime: string;
  saturdayOpenTime: string;
  saturdayCloseTime: string;
  weeklyHours?: WeeklyHours | null;
  whatsappReminder: boolean;
  cancelAlerts: boolean;
}): SalonBusinessSettings {
  const weeklyHours = normalizeWeeklyHours(biz.weeklyHours, biz);
  const legacy = legacyFieldsFromWeekly(weeklyHours);
  return {
    name: biz.name,
    address: biz.address,
    ...legacy,
    weeklyHours,
    whatsappReminder: biz.whatsappReminder,
    cancelAlerts: biz.cancelAlerts,
  };
}

export function validateWeeklyHours(weekly: WeeklyHours): string | null {
  let anyOpen = false;
  for (const [key, day] of Object.entries(weekly) as [WeekdayKey, DaySchedule][]) {
    if (!day.open) continue;
    anyOpen = true;
    const o = parseHmToMinutes(day.openTime);
    const c = parseHmToMinutes(day.closeTime);
    if (Number.isNaN(o) || Number.isNaN(c) || o >= c) {
      return `Horário inválido em ${key}: abertura deve ser antes do fechamento.`;
    }
  }
  if (!anyOpen) return 'Marque pelo menos um dia de funcionamento.';
  return null;
}

/** Mirror of backend rules for immediate FE feedback. */
export function validateAppointmentBusinessHours(
  start: Date,
  durationMinutes: number,
  settings: SalonHoursConfig,
): string | null {
  const hours = resolveHoursForDate(start, settings);
  if (!hours.open) {
    return `O salão não funciona ${hours.dayLabel.toLowerCase()}. Escolha outro dia.`;
  }
  const openM = parseHmToMinutes(hours.openTime);
  const closeM = parseHmToMinutes(hours.closeTime);
  if (Number.isNaN(openM) || Number.isNaN(closeM) || openM >= closeM) {
    return 'Horário de funcionamento inválido. Ajuste em Configurações.';
  }
  if (Number.isNaN(start.getTime())) return 'Data/horário inválido.';

  const startM = salonClockMinutes(start);
  if (Number.isNaN(startM)) return 'Data/horário inválido.';

  const dayHint = ` (${hours.dayLabel.toLowerCase()})`;
  if (startM < openM) {
    return `O salão abre às ${hours.openTime}${dayHint}. Escolha um horário a partir das ${hours.openTime}.`;
  }
  if (startM + durationMinutes > closeM) {
    const last = Math.max(openM, closeM - durationMinutes);
    return `O salão fecha às ${hours.closeTime}${dayHint}. O serviço precisa terminar até as ${hours.closeTime} (último início: ${formatMinutesAsHm(last)}).`;
  }
  return null;
}

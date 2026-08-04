const SALON_TZ = 'America/Sao_Paulo';

export function parseHmToMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return NaN;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

export function formatMinutesAsHm(total: number): string {
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.floor(total)));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function salonClockMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SALON_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? NaN);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? NaN);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return NaN;
  const h = hour === 24 ? 0 : hour;
  return h * 60 + minute;
}

export function salonWeekday(date: Date): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: SALON_TZ,
    weekday: 'short',
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? NaN;
}

export type WeekdayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export type DaySchedule = {
  open: boolean;
  openTime: string;
  closeTime: string;
};

export type WeeklyHours = Record<WeekdayKey, DaySchedule>;

export const WEEKDAY_KEYS: WeekdayKey[] = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
];

export const WEEKDAY_UI_ORDER: WeekdayKey[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  sun: 'Domingo',
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
};

export type SalonHoursConfig = {
  openTime: string;
  closeTime: string;
  saturdayOpenTime?: string;
  saturdayCloseTime?: string;
  weeklyHours?: WeeklyHours | null;
};

export function dayKeyFromWeekday(weekday: number): WeekdayKey {
  return WEEKDAY_KEYS[weekday] ?? 'mon';
}

export function defaultWeeklyHours(from?: {
  openTime?: string;
  closeTime?: string;
  saturdayOpenTime?: string;
  saturdayCloseTime?: string;
}): WeeklyHours {
  const open = from?.openTime ?? '09:00';
  const close = from?.closeTime ?? '19:00';
  const satOpen = from?.saturdayOpenTime ?? open;
  const satClose = from?.saturdayCloseTime ?? '20:00';
  const weekday: DaySchedule = { open: true, openTime: open, closeTime: close };
  return {
    mon: { ...weekday },
    tue: { ...weekday },
    wed: { ...weekday },
    thu: { ...weekday },
    fri: { ...weekday },
    sat: { open: true, openTime: satOpen, closeTime: satClose },
    sun: { open: false, openTime: open, closeTime: close },
  };
}

function asDaySchedule(value: unknown, fallback: DaySchedule): DaySchedule {
  if (!value || typeof value !== 'object') return { ...fallback };
  const v = value as Partial<DaySchedule>;
  const openTime =
    typeof v.openTime === 'string' && !Number.isNaN(parseHmToMinutes(v.openTime))
      ? v.openTime
      : fallback.openTime;
  const closeTime =
    typeof v.closeTime === 'string' &&
    !Number.isNaN(parseHmToMinutes(v.closeTime))
      ? v.closeTime
      : fallback.closeTime;
  return {
    open: v.open !== false,
    openTime,
    closeTime,
  };
}

export function normalizeWeeklyHours(
  raw: unknown,
  legacy?: {
    openTime?: string;
    closeTime?: string;
    saturdayOpenTime?: string;
    saturdayCloseTime?: string;
  },
): WeeklyHours {
  const base = defaultWeeklyHours(legacy);
  if (!raw || typeof raw !== 'object') return base;
  const src = raw as Partial<Record<WeekdayKey, unknown>>;
  const out = { ...base };
  for (const key of WEEKDAY_KEYS) {
    if (src[key] !== undefined) {
      out[key] = asDaySchedule(src[key], base[key]);
    }
  }
  return out;
}

export function legacyFieldsFromWeekly(weekly: WeeklyHours): {
  openTime: string;
  closeTime: string;
  saturdayOpenTime: string;
  saturdayCloseTime: string;
} {
  const firstOpen =
    WEEKDAY_UI_ORDER.map((k) => weekly[k]).find((d) => d.open) ?? weekly.mon;
  return {
    openTime: firstOpen.openTime,
    closeTime: firstOpen.closeTime,
    saturdayOpenTime: weekly.sat.openTime,
    saturdayCloseTime: weekly.sat.closeTime,
  };
}

export type ResolvedDayHours = {
  open: boolean;
  openTime: string;
  closeTime: string;
  dayKey: WeekdayKey;
  dayLabel: string;
  isSaturday: boolean;
};

export function resolveHoursForDate(
  date: Date,
  settings: SalonHoursConfig,
): ResolvedDayHours {
  const dayKey = dayKeyFromWeekday(salonWeekday(date));
  const weekly = normalizeWeeklyHours(settings.weeklyHours, settings);
  const day = weekly[dayKey];
  return {
    open: day.open,
    openTime: day.openTime,
    closeTime: day.closeTime,
    dayKey,
    dayLabel: WEEKDAY_LABELS[dayKey],
    isSaturday: dayKey === 'sat',
  };
}

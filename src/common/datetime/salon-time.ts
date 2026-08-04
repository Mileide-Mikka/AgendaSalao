/** Brazil no longer observes DST; salon day bounds use fixed UTC−3. */
const SALON_OFFSET = '-03:00';
const SALON_TZ = 'America/Sao_Paulo';

export function parseSalonDayStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000${SALON_OFFSET}`);
}

export function parseSalonDayEnd(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999${SALON_OFFSET}`);
}

/** Today's calendar date in America/Sao_Paulo as YYYY-MM-DD. */
export function todaySalonDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SALON_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** "HH:mm" or "HH:mm:ss" → minutes from midnight. */
export function parseHmToMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return NaN;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

export function formatMinutesAsHm(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Clock time in America/Sao_Paulo as minutes from midnight. */
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

/** 0 = Sunday … 6 = Saturday in America/Sao_Paulo. */
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

/** Monday-first for UI. */
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

  const weekdayOpen: DaySchedule = { open: true, openTime: open, closeTime: close };
  const sat: DaySchedule = {
    open: true,
    openTime: satOpen,
    closeTime: satClose,
  };
  const closed: DaySchedule = {
    open: false,
    openTime: open,
    closeTime: close,
  };

  return {
    mon: { ...weekdayOpen },
    tue: { ...weekdayOpen },
    wed: { ...weekdayOpen },
    thu: { ...weekdayOpen },
    fri: { ...weekdayOpen },
    sat: { ...sat },
    sun: { ...closed },
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
    typeof v.closeTime === 'string' && !Number.isNaN(parseHmToMinutes(v.closeTime))
      ? v.closeTime
      : fallback.closeTime;
  return {
    open: v.open !== false,
    openTime,
    closeTime,
  };
}

/** Merge partial JSON / API payload into a full WeeklyHours. */
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

/** Keep flat columns in sync for older clients / SQL reporting. */
export function legacyFieldsFromWeekly(weekly: WeeklyHours): {
  openTime: string;
  closeTime: string;
  saturdayOpenTime: string;
  saturdayCloseTime: string;
} {
  const mon = weekly.mon.open
    ? weekly.mon
    : WEEKDAY_UI_ORDER.map((k) => weekly[k]).find((d) => d.open) ?? weekly.mon;
  return {
    openTime: mon.openTime,
    closeTime: mon.closeTime,
    saturdayOpenTime: weekly.sat.openTime,
    saturdayCloseTime: weekly.sat.closeTime,
  };
}

export function assertValidDaySchedule(day: DaySchedule, label: string): void {
  if (!day.open) return;
  const openM = parseHmToMinutes(day.openTime);
  const closeM = parseHmToMinutes(day.closeTime);
  if (Number.isNaN(openM) || Number.isNaN(closeM) || openM >= closeM) {
    throw new Error(
      `Horário inválido (${label}): a abertura deve ser antes do fechamento`,
    );
  }
}

export function assertValidWeeklyHours(weekly: WeeklyHours): void {
  for (const key of WEEKDAY_KEYS) {
    assertValidDaySchedule(weekly[key], WEEKDAY_LABELS[key]);
  }
  if (!WEEKDAY_KEYS.some((k) => weekly[k].open)) {
    throw new Error('Marque pelo menos um dia de funcionamento');
  }
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
  const weekday = salonWeekday(date);
  const dayKey = dayKeyFromWeekday(weekday);
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

/**
 * Ensures the appointment (start → end) fits inside [openTime, closeTime]
 * on a single salon calendar day (America/Sao_Paulo).
 * Throws Error with a user-facing Portuguese message.
 */
export function assertWithinBusinessHours(
  start: Date,
  end: Date,
  openTime: string,
  closeTime: string,
  options?: { dayLabel?: string; open?: boolean },
): void {
  const dayLabel = options?.dayLabel
    ? ` (${options.dayLabel.toLowerCase()})`
    : '';

  if (options?.open === false) {
    throw new Error(
      `Horário bloqueado: o salão não funciona${dayLabel || ' neste dia'}. Escolha outro dia.`,
    );
  }

  const openM = parseHmToMinutes(openTime);
  const closeM = parseHmToMinutes(closeTime);
  if (Number.isNaN(openM) || Number.isNaN(closeM)) {
    throw new Error('Horário de funcionamento inválido nas configurações');
  }
  if (openM >= closeM) {
    throw new Error(
      'Horário de funcionamento inválido: abertura deve ser antes do fechamento',
    );
  }

  const startM = salonClockMinutes(start);
  if (Number.isNaN(startM)) {
    throw new Error('Data de início inválida');
  }

  const durationMin = (end.getTime() - start.getTime()) / 60_000;
  if (durationMin <= 0) {
    throw new Error('Duração do atendimento inválida');
  }

  if (startM < openM) {
    throw new Error(
      `Horário bloqueado: o salão abre às ${openTime}${dayLabel}. Escolha um horário a partir das ${openTime}.`,
    );
  }

  const finishM = startM + durationMin;
  if (finishM > closeM) {
    throw new Error(
      `Horário bloqueado: o salão fecha às ${closeTime}${dayLabel}. O serviço precisa terminar até as ${closeTime}.`,
    );
  }
}

/** Convenience: resolve + assert from full settings. */
export function assertAppointmentInBusinessHours(
  start: Date,
  end: Date,
  settings: SalonHoursConfig,
): void {
  const hours = resolveHoursForDate(start, settings);
  assertWithinBusinessHours(start, end, hours.openTime, hours.closeTime, {
    dayLabel: hours.dayLabel,
    open: hours.open,
  });
}

/** Brazil no longer observes DST; salon day bounds use fixed UTC−3. */
const SALON_OFFSET = '-03:00';

export function parseSalonDayStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000${SALON_OFFSET}`);
}

export function parseSalonDayEnd(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999${SALON_OFFSET}`);
}

/** Today's calendar date in America/Sao_Paulo as YYYY-MM-DD. */
export function todaySalonDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

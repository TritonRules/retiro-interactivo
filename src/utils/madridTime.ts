import * as impl from './madridTime.shared.mjs';

export const MADRID_TZ = 'Europe/Madrid' as const;

export type ParseMadridFailure = {
  ok: false;
  reason: 'invalid' | 'invalid-date' | 'nonexistent' | 'ambiguous';
};

export type ParseMadridInstant = {
  ok: true;
  iso: string;
  utcMs: number;
  dateOnly?: false;
  explicitOffset?: boolean;
  originalIso?: string;
};

export type ParseMadridDateOnly = {
  ok: true;
  dateOnly: true;
  day: string;
};

export type ParseMadridResult = ParseMadridFailure | ParseMadridInstant | ParseMadridDateOnly;

export function offsetMinutesAt(utcMs: number): number {
  return impl.offsetMinutesAt(utcMs);
}

export function formatOffset(offsetMinutes: number): string {
  return impl.formatOffset(offsetMinutes);
}

export function isValidCivilDate(year: number, month: number, day: number): boolean {
  return impl.isValidCivilDate(year, month, day);
}

export function madridDayKey(instant: number | Date): string {
  return impl.madridDayKey(instant);
}

export function madridWeekdayCode(instant: number | Date | string): string | null {
  return impl.madridWeekdayCode(instant);
}

export function parseMadridWallClock(raw: string | null | undefined): ParseMadridResult {
  return impl.parseMadridWallClock(raw) as ParseMadridResult;
}

export function madridDayBounds(dayKey: string): {
  startMs: number;
  endMs: number;
  startIso: string;
  endIso: string;
  nextKey: string;
} {
  const bounds = impl.madridDayBounds(dayKey);
  return {
    startMs: Number(bounds.startMs),
    endMs: Number(bounds.endMs),
    startIso: String(bounds.startIso),
    endIso: String(bounds.endIso),
    nextKey: String(bounds.nextKey),
  };
}

export function nextMadridMidnight(instant: number | Date): number {
  return Number(impl.nextMadridMidnight(instant));
}

export function addMadridDays(dayKey: string, days: number): string {
  return impl.addMadridDays(dayKey, days);
}

export function eachMadridDay(fromKey: string, toKeyExclusive: string): string[] {
  return impl.eachMadridDay(fromKey, toKeyExclusive);
}

export function formatMadridDateTime(
  iso: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  },
): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: MADRID_TZ,
    ...options,
  }).format(new Date(iso));
}

export function formatMadridTime(iso: string): string {
  return impl.formatMadridTime(iso);
}

export function parseExcludedDayList(raw: string | null | undefined): string[] {
  return impl.parseExcludedDayList(raw);
}

export function weekdayFromDayKey(dayKey: string): string | null {
  return impl.weekdayFromDayKey(dayKey);
}

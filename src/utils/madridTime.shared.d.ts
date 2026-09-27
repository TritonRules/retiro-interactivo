export const MADRID_TZ: 'Europe/Madrid';

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

export function offsetMinutesAt(utcMs: number): number;
export function formatOffset(offsetMinutes: number): string;
export function isValidCivilDate(year: number, month: number, day: number): boolean;
export function madridDayKey(instant: number | Date): string;
export function madridWeekdayCode(instant: number | Date | string): string | null;
export function parseMadridWallClock(raw: string | null | undefined): ParseMadridResult;
export function madridDayBounds(dayKey: string): {
  startMs: number;
  endMs: number;
  startIso: string;
  endIso: string;
  nextKey: string;
};
export function nextMadridMidnight(instant: number | Date): number;
export function addMadridDays(dayKey: string, days: number): string;
export function eachMadridDay(fromKey: string, toKeyExclusive: string): string[];
export function formatMadridDateTime(
  iso: string,
  options?: Intl.DateTimeFormatOptions,
): string;
export function formatMadridTime(iso: string): string;
export function parseExcludedDayList(raw: string | null | undefined): string[];
export function weekdayFromDayKey(dayKey: string): string | null;

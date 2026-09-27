import { FRESHNESS } from '../config/freshness';
import type { ParkEvent, WeekdayCode } from '../types/event';
import {
  addMadridDays,
  madridDayBounds,
  madridDayKey,
  parseMadridWallClock,
  weekdayFromDayKey,
} from './madridTime';

export interface EventSession {
  eventId: string;
  dayKey: string;
  startMs: number;
  /** Fin exclusivo. Si `endKnown` es false, es solo ventana de visibilidad (medianoche siguiente). */
  endMs: number;
  endKnown: boolean;
  cancelled: boolean;
}

const WEEKDAYS: WeekdayCode[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

function isWeekday(code: string): code is WeekdayCode {
  return (WEEKDAYS as string[]).includes(code);
}

export function exclusiveEndFromInclusiveSource(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`Instante inválido: ${iso}`);
  const day = madridDayKey(ms);
  const { startMs, endMs, endIso } = madridDayBounds(day);
  if (ms >= startMs && ms < endMs) {
    const wall = new Date(ms);
    const hourMin =
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Madrid',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(wall);
    if (hourMin >= '23:59') return endIso;
  }
  return new Date(ms + 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function sessionStartOnDay(dayKey: string, hhmm: string): number | null {
  const parsed = parseMadridWallClock(`${dayKey}T${hhmm}:00`);
  if (!parsed.ok || parsed.dateOnly) return null;
  return parsed.utcMs;
}

function visibilityEnd(dayKey: string): number {
  return madridDayBounds(dayKey).endMs;
}

function sessionsFromTimes(
  event: ParkEvent,
  dayKey: string,
  times: string[],
  cancelled: boolean,
): EventSession[] {
  const sessions: EventSession[] = [];
  for (const hhmm of times) {
    const startMs = sessionStartOnDay(dayKey, hhmm);
    if (startMs == null) continue;
    sessions.push({
      eventId: event.id,
      dayKey,
      startMs,
      endMs: visibilityEnd(dayKey),
      endKnown: false,
      cancelled,
    });
  }
  return sessions;
}

export function eventTimePrecision(event: ParkEvent): 'exact' | 'unknown' | 'allDay' {
  if (event.schedule?.timePrecision) return event.schedule.timePrecision;
  if (event.allDay) return 'allDay';
  const start = parseMadridWallClock(event.startAt);
  if (start.ok && !start.dateOnly) {
    const time = event.startAt.slice(11, 16);
    if (time === '00:00') return 'unknown';
    return 'exact';
  }
  return 'unknown';
}

function sessionTimesOf(event: ParkEvent): string[] {
  if (event.schedule?.sessionTimes?.length) return event.schedule.sessionTimes;
  if (eventTimePrecision(event) !== 'exact') return [];
  const start = event.startAt.slice(11, 16);
  return /^\d{2}:\d{2}$/.test(start) ? [start] : [];
}

function excludedSet(event: ParkEvent): Set<string> {
  return new Set(event.schedule?.recurrence?.excludedDays ?? []);
}

function seriesStartDay(event: ParkEvent): string {
  return madridDayKey(Date.parse(event.startAt));
}

function seriesUntilExclusiveMs(event: ParkEvent): number {
  const until = event.schedule?.recurrence?.untilExclusive;
  if (until) {
    const ms = Date.parse(until);
    if (!Number.isNaN(ms)) return ms;
  }
  const end = event.endAt || event.expiresAt;
  const ms = Date.parse(end);
  if (Number.isNaN(ms)) return Date.parse(event.startAt);
  return ms;
}

function dayMatchesRecurrence(event: ParkEvent, dayKey: string): boolean {
  const rec = event.schedule?.recurrence;
  if (!rec) return false;
  if (excludedSet(event).has(dayKey)) return false;
  const weekday = weekdayFromDayKey(dayKey);
  if (!weekday || !isWeekday(weekday)) return false;
  if (!rec.byDay.includes(weekday)) return false;
  const startDay = seriesStartDay(event);
  if (dayKey < startDay) return false;
  const untilMs = seriesUntilExclusiveMs(event);
  const { startMs } = madridDayBounds(dayKey);
  if (startMs >= untilMs) return false;
  if (rec.frequency === 'DAILY') {
    const from = Date.parse(`${startDay}T12:00:00Z`);
    const to = Date.parse(`${dayKey}T12:00:00Z`);
    const diffDays = Math.round((to - from) / 86400000);
    return diffDays >= 0 && diffDays % rec.interval === 0;
  }
  if (rec.frequency === 'WEEKLY') {
    if (rec.interval <= 1) return true;
    const from = Date.parse(`${startDay}T12:00:00Z`);
    const to = Date.parse(`${dayKey}T12:00:00Z`);
    const diffWeeks = Math.floor(Math.round((to - from) / 86400000) / 7);
    return diffWeeks % rec.interval === 0;
  }
  return false;
}

function sessionsForDay(event: ParkEvent, dayKey: string): EventSession[] {
  if (event.status === 'cancelled') return [];
  const cancelledDay = excludedSet(event).has(dayKey);

  if (event.schedule?.recurrence) {
    if (!dayMatchesRecurrence(event, dayKey)) return [];
    const precision = eventTimePrecision(event);
    const times = sessionTimesOf(event);
    if (precision === 'allDay' || times.length === 0) {
      const { startMs, endMs } = madridDayBounds(dayKey);
      return [
        {
          eventId: event.id,
          dayKey,
          startMs,
          endMs,
          endKnown: precision === 'allDay',
          cancelled: cancelledDay,
        },
      ];
    }
    return sessionsFromTimes(event, dayKey, times, cancelledDay);
  }

  const startMs = Date.parse(event.startAt);
  if (Number.isNaN(startMs)) return [];
  const untilMs = seriesUntilExclusiveMs(event);
  const { startMs: dayStart, endMs: dayEnd } = madridDayBounds(dayKey);
  if (untilMs <= dayStart || startMs >= dayEnd) return [];
  if (event.status === 'postponed') return [];

  const precision = eventTimePrecision(event);
  if (precision === 'allDay') {
    const sessionStart = Math.max(startMs, dayStart);
    const sessionEnd = Math.min(untilMs, dayEnd);
    if (sessionEnd <= sessionStart) return [];
    return [
      {
        eventId: event.id,
        dayKey,
        startMs: sessionStart,
        endMs: sessionEnd,
        endKnown: true,
        cancelled: cancelledDay,
      },
    ];
  }

  const startDay = madridDayKey(startMs);
  const spansDays = untilMs > madridDayBounds(startDay).endMs;

  if (spansDays) {
    // Un dtend de periodo no implica apertura diaria. Sin regla de recurrencia
    // solo hay sesión el día de inicio.
    if (dayKey !== startDay) return [];
  }

  if (madridDayKey(startMs) !== dayKey) return [];
  const times = sessionTimesOf(event);
  if (times.length > 1) {
    return sessionsFromTimes(event, dayKey, times, cancelledDay);
  }
  if (precision === 'unknown' || times.length === 0) {
    return [
      {
        eventId: event.id,
        dayKey,
        startMs: dayStart,
        endMs: Math.min(untilMs, dayEnd),
        endKnown: false,
        cancelled: cancelledDay,
      },
    ];
  }

  const knownEnd = !Number.isNaN(Date.parse(event.endAt ?? '')) && event.endAt
    ? Date.parse(event.endAt) > startMs && madridDayKey(Date.parse(event.endAt)) === dayKey
    : false;
  const endMs = knownEnd ? Date.parse(event.endAt as string) : Math.min(untilMs, dayEnd);
  return [
    {
      eventId: event.id,
      dayKey,
      startMs,
      endMs: endMs > startMs ? endMs : visibilityEnd(dayKey),
      endKnown: knownEnd,
      cancelled: cancelledDay,
    },
  ];
}

export function sessionsOnMadridDay(event: ParkEvent, dayKey: string): EventSession[] {
  return sessionsForDay(event, dayKey).filter((session) => !session.cancelled);
}

export function sessionState(
  session: EventSession,
  nowMs: number,
): 'upcoming' | 'in-progress' | 'ended' {
  if (nowMs < session.startMs) return 'upcoming';
  if (nowMs < session.endMs) return 'in-progress';
  return 'ended';
}

export function isOnMadridDay(event: ParkEvent, dayKey: string): boolean {
  return sessionsOnMadridDay(event, dayKey).length > 0;
}

export function nextValidSession(
  event: ParkEvent,
  nowMs: number,
  horizonDays = FRESHNESS.expansionHorizonDays,
): EventSession | null {
  if (event.status !== 'published') return null;
  const today = madridDayKey(nowMs);
  let cursor = today;
  for (let i = 0; i <= horizonDays; i += 1) {
    const sessions = sessionsOnMadridDay(event, cursor).sort((a, b) => a.startMs - b.startMs);
    const upcoming = sessions.find((session) => session.endMs > nowMs);
    if (upcoming) return upcoming;
    cursor = addMadridDays(cursor, 1);
  }
  if (!event.schedule?.recurrence) {
    const startMs = Date.parse(event.startAt);
    const untilMs = seriesUntilExclusiveMs(event);
    if (!Number.isNaN(startMs) && startMs <= nowMs && nowMs < untilMs) {
      return {
        eventId: event.id,
        dayKey: madridDayKey(startMs),
        startMs,
        endMs: untilMs,
        endKnown: Boolean(event.endAt),
        cancelled: false,
      };
    }
  }
  return null;
}

export function todaysSessions(
  event: ParkEvent,
  nowMs: number,
): { session: EventSession; state: ReturnType<typeof sessionState> }[] {
  const dayKey = madridDayKey(nowMs);
  return sessionsOnMadridDay(event, dayKey)
    .sort((a, b) => a.startMs - b.startMs)
    .map((session) => ({ session, state: sessionState(session, nowMs) }));
}

export function isExpiredAt(event: ParkEvent, nowMs: number): boolean {
  if (event.status === 'expired') return true;
  const expires = Date.parse(event.expiresAt);
  if (!Number.isNaN(expires) && expires <= nowMs) return true;
  return nextValidSession(event, nowMs) == null && Date.parse(event.startAt) < nowMs;
}

export function compareByNextSession(a: ParkEvent, b: ParkEvent, nowMs: number): number {
  const na = nextValidSession(a, nowMs);
  const nb = nextValidSession(b, nowMs);
  if (!na && !nb) return Date.parse(a.startAt) - Date.parse(b.startAt);
  if (!na) return 1;
  if (!nb) return -1;
  return na.startMs - nb.startMs;
}

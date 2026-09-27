/**
 * Interpreta recurrence / time / excluded-days de Madrid Open Data.
 */
import {
  madridDayBounds,
  parseExcludedDayList,
  parseMadridWallClock,
} from '../../src/utils/madridTime.shared.mjs';

const DAY_MAP = {
  L: 'MO',
  M: 'TU',
  X: 'WE',
  J: 'TH',
  V: 'FR',
  S: 'SA',
  D: 'SU',
  MO: 'MO',
  TU: 'TU',
  WE: 'WE',
  TH: 'TH',
  FR: 'FR',
  SA: 'SA',
  SU: 'SU',
};

export function parseByDay(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,\s]+/)
    .map((token) => DAY_MAP[token.trim().toUpperCase()])
    .filter(Boolean);
}

export function parseSessionTimes(raw) {
  if (!raw || !String(raw).trim()) return [];
  const times = [];
  for (const token of String(raw).match(/\d{1,2}:\d{2}/g) || []) {
    const [h, m] = token.split(':');
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    if (Number(hh) < 24 && Number(mm) < 60) times.push(`${hh}:${mm}`);
  }
  return [...new Set(times)];
}

export function instantFromWallClock(raw) {
  const parsed = parseMadridWallClock(raw);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  if (parsed.dateOnly) {
    const start = parseMadridWallClock(`${parsed.day}T00:00:00`);
    if (!start.ok || start.dateOnly) return { ok: false, reason: 'invalid' };
    return { ok: true, iso: start.iso, dateOnly: true, day: parsed.day };
  }
  return { ok: true, iso: parsed.iso, dateOnly: false };
}

export function exclusiveEndIso(inclusiveIso) {
  const ms = Date.parse(inclusiveIso);
  if (Number.isNaN(ms)) return inclusiveIso;
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
  const { endMs, endIso } = madridDayBounds(day);
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(ms));
  if (clock >= '23:59' || ms + 1000 >= endMs) return endIso;
  return new Date(ms + 1000).toISOString();
}

export function scheduleFromSource(raw, startAt, endAt) {
  const parseIssues = [];
  const times = parseSessionTimes(raw.time);
  const startParsed = parseMadridWallClock(raw.dtstart);
  const dateOnly = Boolean(startParsed.ok && startParsed.dateOnly);
  const midnight =
    startAt?.includes('T00:00:00') && (!raw.time || !String(raw.time).trim());
  const timePrecision = times.length ? 'exact' : midnight || dateOnly ? 'unknown' : 'exact';

  const daysRaw = raw.recurrence?.days;
  const frequency = raw.recurrence?.frequency
    ? String(raw.recurrence.frequency).toUpperCase()
    : '';
  const interval = Number(raw.recurrence?.interval || 1);
  const byDay = parseByDay(daysRaw);
  const excludedDays = parseExcludedDayList(raw['excluded-days']);
  const untilExclusive = endAt ? exclusiveEndIso(endAt) : undefined;

  const schedule = {
    timePrecision,
    sessionTimes: timePrecision === 'exact' ? times : [],
  };

  if (frequency && frequency !== 'WEEKLY' && frequency !== 'DAILY') {
    parseIssues.push(`frequency-unsupported:${frequency}`);
  } else if (byDay.length && (frequency === 'WEEKLY' || frequency === 'DAILY' || !frequency)) {
    if (!untilExclusive) parseIssues.push('series-without-end');
    else {
      schedule.recurrence = {
        frequency: frequency === 'DAILY' ? 'DAILY' : 'WEEKLY',
        interval: Number.isFinite(interval) && interval > 0 ? interval : 1,
        byDay,
        untilExclusive,
        excludedDays,
      };
    }
  } else if (daysRaw && !byDay.length) {
    parseIssues.push('byday-unparsed');
  }

  if (parseIssues.length) schedule.parseIssues = parseIssues;
  return { schedule, untilExclusive, parseIssues };
}

/**
 * Contrato temporal Europe/Madrid, sin depender de la zona del proceso.
 * Usado por el cliente (vía reexport TS) y por el pipeline .mjs.
 */

export const MADRID_TZ = 'Europe/Madrid';

function pad(value) {
  return String(value).padStart(2, '0');
}

export function offsetMinutesAt(utcMs) {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: MADRID_TZ,
    timeZoneName: 'longOffset',
  })
    .formatToParts(new Date(utcMs))
    .find((part) => part.type === 'timeZoneName')?.value;
  const match = name?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i);
  if (!match) {
    throw new Error(`No se pudo leer el offset de Madrid en ${new Date(utcMs).toISOString()}`);
  }
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] || 0));
}

export function formatOffset(offsetMinutes) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export function isValidCivilDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const utc = Date.UTC(year, month - 1, day);
  const probe = new Date(utc);
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

function wallClockFromInstant(utcMs) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: MADRID_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      weekday: 'short',
    })
      .formatToParts(new Date(utcMs))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
  };
}

export function madridDayKey(instant) {
  const { year, month, day } = wallClockFromInstant(
    instant instanceof Date ? instant.getTime() : instant,
  );
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function madridWeekdayCode(instant) {
  const names = { Sun: 'SU', Mon: 'MO', Tue: 'TU', Wed: 'WE', Thu: 'TH', Fri: 'FR', Sat: 'SA' };
  const { weekday } = wallClockFromInstant(
    instant instanceof Date ? instant.getTime() : Date.parse(instant),
  );
  return names[weekday] ?? null;
}

/**
 * Interpreta fecha/hora civil de Madrid.
 * Instantes con offset explícito se respetan. Sin offset: IANA, nunca un mes fijo.
 */
export function parseMadridWallClock(raw) {
  if (raw == null) return { ok: false, reason: 'invalid' };
  if (typeof raw !== 'string') return { ok: false, reason: 'invalid' };
  const cleaned = raw.replace(/\.0$/, '').trim();
  if (!cleaned) return { ok: false, reason: 'invalid' };

  const withOffset = cleaned.match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})$/,
  );
  if (withOffset) {
    const iso = `${withOffset[1]}T${withOffset[2]}:${withOffset[3]}:${withOffset[4] || '00'}${withOffset[5]}`;
    const utcMs = Date.parse(iso);
    if (Number.isNaN(utcMs)) return { ok: false, reason: 'invalid' };
    return { ok: true, iso: new Date(utcMs).toISOString().replace(/Z$/, '+00:00').replace('.000+00:00', '+00:00'), utcMs, explicitOffset: true, originalIso: iso };
  }

  const local = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!local) return { ok: false, reason: 'invalid' };
  const year = Number(local[1]);
  const month = Number(local[2]);
  const day = Number(local[3]);
  const hour = local[4] == null ? null : Number(local[4]);
  const minute = local[5] == null ? 0 : Number(local[5]);
  const second = local[6] == null ? 0 : Number(local[6]);
  if (!isValidCivilDate(year, month, day)) return { ok: false, reason: 'invalid-date' };

  if (hour == null) {
    return {
      ok: true,
      dateOnly: true,
      day: `${year}-${pad(month)}-${pad(day)}`,
    };
  }
  if (hour > 23 || minute > 59 || second > 59) return { ok: false, reason: 'invalid' };

  const matches = [];
  for (const guess of [60, 120]) {
    const utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - guess * 60 * 1000;
    const actual = offsetMinutesAt(utcMs);
    const wall = wallClockFromInstant(utcMs);
    if (
      actual === guess &&
      wall.year === year &&
      wall.month === month &&
      wall.day === day &&
      wall.hour === hour &&
      wall.minute === minute &&
      wall.second === second
    ) {
      matches.push({ utcMs, offsetMinutes: actual });
    }
  }

  if (matches.length === 0) return { ok: false, reason: 'nonexistent' };
  if (matches.length > 1) return { ok: false, reason: 'ambiguous' };

  const chosen = matches[0];
  const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}${formatOffset(chosen.offsetMinutes)}`;
  return { ok: true, iso, utcMs: chosen.utcMs, dateOnly: false };
}

export function madridDayBounds(dayKey) {
  const start = parseMadridWallClock(`${dayKey}T00:00:00`);
  if (!start.ok || start.dateOnly) {
    throw new Error(`Día Madrid inválido: ${dayKey}`);
  }
  const [year, month, day] = dayKey.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextKey = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
  const end = parseMadridWallClock(`${nextKey}T00:00:00`);
  if (!end.ok) throw new Error(`No se pudo calcular el día siguiente de ${dayKey}`);
  return { startMs: start.utcMs, endMs: end.utcMs, startIso: start.iso, endIso: end.iso, nextKey };
}

export function nextMadridMidnight(instant) {
  const key = madridDayKey(instant);
  return madridDayBounds(key).endMs;
}

export function addMadridDays(dayKey, days) {
  const [year, month, day] = dayKey.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function eachMadridDay(fromKey, toKeyExclusive) {
  const days = [];
  let cursor = fromKey;
  while (cursor < toKeyExclusive) {
    days.push(cursor);
    cursor = addMadridDays(cursor, 1);
  }
  return days;
}

export function formatMadridDateTime(iso, options = { dateStyle: 'medium', timeStyle: 'short' }) {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: MADRID_TZ,
    ...options,
  }).format(new Date(iso));
}

export function formatMadridTime(iso) {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: MADRID_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

/** Listas municipales `d/m/yyyy;` — no usar Date.parse del navegador. */
export function parseExcludedDayList(raw) {
  if (!raw) return [];
  const days = [];
  for (const token of String(raw).split(/[;,]/)) {
    const piece = token.trim();
    if (!piece) continue;
    const match = piece.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) continue;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (!isValidCivilDate(year, month, day)) continue;
    days.push(`${year}-${pad(month)}-${pad(day)}`);
  }
  return days;
}

export function weekdayFromDayKey(dayKey) {
  const noon = parseMadridWallClock(`${dayKey}T12:00:00`);
  if (!noon.ok) return null;
  const names = { Sun: 'SU', Mon: 'MO', Tue: 'TU', Wed: 'WE', Thu: 'TH', Fri: 'FR', Sat: 'SA' };
  const { weekday } = wallClockFromInstant(noon.utcMs);
  return names[weekday] ?? null;
}

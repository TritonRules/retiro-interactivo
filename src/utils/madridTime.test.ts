import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  formatMadridTime,
  madridDayBounds,
  parseExcludedDayList,
  parseMadridWallClock,
} from './madridTime';

describe('parseMadridWallClock', () => {
  it('muestra 10:00 Madrid el 30/03/2026 y el 26/10/2026', () => {
    const spring = parseMadridWallClock('2026-03-30 10:00:00.0');
    const autumn = parseMadridWallClock('2026-10-26 10:00:00');
    expect(spring.ok && !spring.dateOnly).toBe(true);
    expect(autumn.ok && !autumn.dateOnly).toBe(true);
    if (spring.ok && !spring.dateOnly) {
      expect(spring.iso).toBe('2026-03-30T10:00:00+02:00');
      expect(formatMadridTime(spring.iso)).toMatch(/10:00/);
    }
    if (autumn.ok && !autumn.dateOnly) {
      expect(autumn.iso).toBe('2026-10-26T10:00:00+01:00');
      expect(formatMadridTime(autumn.iso)).toMatch(/10:00/);
    }
  });

  it('rechaza 2026-03-29 02:30 (inexistente) y 2026-10-25 02:30 (ambigua)', () => {
    expect(parseMadridWallClock('2026-03-29 02:30:00')).toEqual({
      ok: false,
      reason: 'nonexistent',
    });
    expect(parseMadridWallClock('2026-10-25 02:30:00')).toEqual({
      ok: false,
      reason: 'ambiguous',
    });
  });

  it('respeta un instante con offset explícito incluso en la hora ambigua', () => {
    const first = parseMadridWallClock('2026-10-25T02:30:00+02:00');
    const second = parseMadridWallClock('2026-10-25T02:30:00+01:00');
    expect(first.ok && !first.dateOnly).toBe(true);
    expect(second.ok && !second.dateOnly).toBe(true);
    if (first.ok && !first.dateOnly && second.ok && !second.dateOnly) {
      expect(first.utcMs).not.toBe(second.utcMs);
      expect(second.utcMs - first.utcMs).toBe(3600_000);
    }
  });

  it('rechaza fechas civiles inexistentes', () => {
    expect(parseMadridWallClock('2026-02-30 10:00:00')).toEqual({
      ok: false,
      reason: 'invalid-date',
    });
  });

  it('distingue fecha local sin hora de un instante a medianoche', () => {
    const dateOnly = parseMadridWallClock('2026-06-29');
    expect(dateOnly).toMatchObject({ ok: true, dateOnly: true, day: '2026-06-29' });
    const midnight = parseMadridWallClock('2026-06-29T00:00:00');
    expect(midnight.ok && !midnight.dateOnly).toBe(true);
  });

  it('obtiene el mismo ISO con TZ=UTC y TZ=Europe/Madrid', () => {
    const script = `
      import { parseMadridWallClock } from './src/utils/madridTime.shared.mjs';
      const r = parseMadridWallClock('2026-03-30 10:00:00');
      if (!r.ok || r.dateOnly) { console.log('FAIL'); process.exit(1); }
      console.log(r.iso);
    `;
    const utc = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: process.cwd(),
      env: { ...process.env, TZ: 'UTC' },
      encoding: 'utf8',
    });
    const madrid = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: process.cwd(),
      env: { ...process.env, TZ: 'Europe/Madrid' },
      encoding: 'utf8',
    });
    expect(utc.status).toBe(0);
    expect(madrid.status).toBe(0);
    expect(utc.stdout.trim()).toBe('2026-03-30T10:00:00+02:00');
    expect(madrid.stdout.trim()).toBe(utc.stdout.trim());
  });

  it('calcula la medianoche siguiente en el cambio de octubre (offsets distintos)', () => {
    const start = parseMadridWallClock('2026-10-25T00:00:00');
    expect(start.ok && !start.dateOnly).toBe(true);
    if (start.ok && !start.dateOnly) {
      expect(start.iso).toBe('2026-10-25T00:00:00+02:00');
      const { endIso } = madridDayBounds('2026-10-25');
      expect(endIso).toBe('2026-10-26T00:00:00+01:00');
    }
  });
});

describe('parseExcludedDayList', () => {
  it('interpreta listas municipales d/m/yyyy;', () => {
    expect(parseExcludedDayList('1/9/2026;8/9/2026;')).toEqual([
      '2026-09-01',
      '2026-09-08',
    ]);
    expect(parseExcludedDayList('23/10/2026;20/11/2026;4/12/2026;6/11/2026;')).toEqual([
      '2026-10-23',
      '2026-11-20',
      '2026-12-04',
      '2026-11-06',
    ]);
  });
});

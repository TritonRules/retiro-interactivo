import { describe, expect, it } from 'vitest';
import type { ParkEvent } from '../types/event';
import {
  isOnMadridDay,
  nextValidSession,
  sessionState,
  sessionsOnMadridDay,
} from './eventSchedule';

function event(partial: Partial<ParkEvent> & Pick<ParkEvent, 'id' | 'startAt'>): ParkEvent {
  return {
    slug: partial.id,
    title: partial.title ?? partial.id,
    shortDescription: 'Descripción de prueba con más de cinco caracteres.',
    venue: 'Centro de Educación Ambiental El Retiro',
    category: 'Exposiciones',
    sourceName: 'Agenda de actividades y eventos',
    sourceUrl: 'https://datos.madrid.es/egob/catalogo/300107-0-agenda-actividades-eventos.json',
    sourceTier: 'A',
    lastCheckedAt: '2026-09-06T08:00:00.000Z',
    expiresAt: partial.expiresAt ?? partial.endAt ?? '2026-12-31T23:00:00+01:00',
    confidence: 0.9,
    status: 'published',
    ...partial,
  };
}

const bic = event({
  id: 'evt-50346030',
  title: '90 años BIC',
  startAt: '2026-07-01T10:00:00+02:00',
  endAt: '2026-09-30T23:59:00+02:00',
  expiresAt: '2026-10-01T00:00:00+02:00',
  schedule: {
    timePrecision: 'exact',
    sessionTimes: ['10:00'],
    recurrence: {
      frequency: 'WEEKLY',
      interval: 1,
      byDay: ['TU', 'WE', 'TH', 'FR', 'SA', 'SU'],
      untilExclusive: '2026-10-01T00:00:00+02:00',
      excludedDays: [],
    },
  },
});

describe('contrato de sesiones', () => {
  it('incluye una exposición de varios días que empezó antes si hoy hay sesión', () => {
    const sunday = Date.parse('2026-09-06T12:00:00+02:00');
    expect(isOnMadridDay(bic, '2026-09-06')).toBe(true);
    const next = nextValidSession(bic, sunday);
    expect(next?.dayKey).toBe('2026-09-06');
    expect(next?.startMs).toBe(Date.parse('2026-09-06T10:00:00+02:00'));
  });

  it('ausenta el lunes de una serie martes a domingo', () => {
    expect(isOnMadridDay(bic, '2026-09-07')).toBe(false);
    const monday = Date.parse('2026-09-07T12:00:00+02:00');
    const next = nextValidSession(bic, monday);
    expect(next?.dayKey).toBe('2026-09-08');
  });

  it('respeta un día excluido sin borrar el resto de la serie', () => {
    const withGap = event({
      ...bic,
      id: 'evt-excl',
      schedule: {
        timePrecision: 'exact',
        sessionTimes: ['10:00'],
        recurrence: {
          frequency: 'WEEKLY',
          interval: 1,
          byDay: ['TU', 'WE', 'TH', 'FR', 'SA', 'SU'],
          untilExclusive: '2026-10-01T00:00:00+02:00',
          excludedDays: ['2026-09-08'],
        },
      },
    });
    expect(isOnMadridDay(withGap, '2026-09-08')).toBe(false);
    expect(isOnMadridDay(withGap, '2026-09-09')).toBe(true);
  });

  it('conserva dos pases el mismo día', () => {
    const twice = event({
      id: 'evt-two',
      startAt: '2026-09-06T10:00:00+02:00',
      expiresAt: '2026-09-07T00:00:00+02:00',
      schedule: {
        timePrecision: 'exact',
        sessionTimes: ['10:00', '17:00'],
        recurrence: {
          frequency: 'WEEKLY',
          interval: 1,
          byDay: ['SU'],
          untilExclusive: '2026-09-07T00:00:00+02:00',
          excludedDays: [],
        },
      },
    });
    const sessions = sessionsOnMadridDay(twice, '2026-09-06');
    expect(sessions).toHaveLength(2);
    expect(sessions.map((s) => s.startMs)).toEqual([
      Date.parse('2026-09-06T10:00:00+02:00'),
      Date.parse('2026-09-06T17:00:00+02:00'),
    ]);
  });

  it('cancela una sesión y conserva las demás', () => {
    const series = event({
      id: 'evt-cancel-one',
      startAt: '2026-09-04T18:00:00+02:00',
      expiresAt: '2026-09-28T00:00:00+02:00',
      schedule: {
        timePrecision: 'exact',
        sessionTimes: ['18:00'],
        recurrence: {
          frequency: 'WEEKLY',
          interval: 1,
          byDay: ['FR'],
          untilExclusive: '2026-09-28T00:00:00+02:00',
          excludedDays: ['2026-09-11'],
        },
      },
    });
    expect(isOnMadridDay(series, '2026-09-11')).toBe(false);
    expect(isOnMadridDay(series, '2026-09-18')).toBe(true);
  });

  it('no trata una hora desconocida como todo el día ni como 00:00 de visita', () => {
    const unknown = event({
      id: 'evt-libros',
      startAt: '2026-06-29T00:00:00+02:00',
      endAt: '2026-08-31T23:59:00+02:00',
      expiresAt: '2026-09-01T00:00:00+02:00',
      allDay: false,
      schedule: {
        timePrecision: 'unknown',
        sessionTimes: [],
        recurrence: {
          frequency: 'WEEKLY',
          interval: 1,
          byDay: ['MO', 'TU', 'WE', 'TH', 'FR'],
          untilExclusive: '2026-09-01T00:00:00+02:00',
          excludedDays: ['2026-08-15'],
        },
      },
    });
    expect(unknown.schedule?.timePrecision).toBe('unknown');
    expect(isOnMadridDay(unknown, '2026-08-14')).toBe(true);
    expect(isOnMadridDay(unknown, '2026-08-15')).toBe(false);
    expect(isOnMadridDay(unknown, '2026-08-16')).toBe(false);
  });

  it('etiqueta como finalizada una sesión de hoy que ya terminó y no la ofrece como plan vigente', () => {
    const timed = event({
      id: 'evt-morning',
      startAt: '2026-09-06T10:00:00+02:00',
      endAt: '2026-09-06T11:00:00+02:00',
      expiresAt: '2026-09-06T11:00:00+02:00',
      schedule: { timePrecision: 'exact', sessionTimes: ['10:00'] },
    });
    const after = Date.parse('2026-09-06T12:00:00+02:00');
    const sessions = sessionsOnMadridDay(timed, '2026-09-06');
    expect(sessions).toHaveLength(1);
    expect(sessionState(sessions[0], after)).toBe('ended');
    expect(nextValidSession(timed, after)).toBeNull();
  });

  it('trata el instante exacto de fin como exclusivo', () => {
    const timed = event({
      id: 'evt-end',
      startAt: '2026-09-06T10:00:00+02:00',
      endAt: '2026-09-06T11:00:00+02:00',
      expiresAt: '2026-09-06T11:00:00+02:00',
      schedule: { timePrecision: 'exact', sessionTimes: ['10:00'] },
    });
    const atEnd = Date.parse('2026-09-06T11:00:00+02:00');
    expect(nextValidSession(timed, atEnd - 1)).not.toBeNull();
    expect(nextValidSession(timed, atEnd)).toBeNull();
  });

  it('no inventa sesiones si la regla no está soportada', () => {
    const weird = event({
      id: 'evt-weird',
      startAt: '2026-09-06T10:00:00+02:00',
      expiresAt: '2026-10-01T00:00:00+02:00',
      status: 'needs-review',
      schedule: {
        timePrecision: 'exact',
        sessionTimes: ['10:00'],
        parseIssues: ['frequency-unsupported'],
      },
    });
    expect(nextValidSession(weird, Date.parse('2026-09-06T09:00:00+02:00'))).toBeNull();
  });

  it('ordena por la próxima sesión, no por el primer día histórico', () => {
    const laterStart = event({
      id: 'evt-new',
      startAt: '2026-09-20T18:00:00+02:00',
      expiresAt: '2026-09-20T20:00:00+02:00',
      schedule: { timePrecision: 'exact', sessionTimes: ['18:00'] },
    });
    const now = Date.parse('2026-09-06T12:00:00+02:00');
    const bicNext = nextValidSession(bic, now)?.startMs ?? 0;
    const otherNext = nextValidSession(laterStart, now)?.startMs ?? 0;
    expect(bicNext).toBeLessThan(otherNext);
  });
});

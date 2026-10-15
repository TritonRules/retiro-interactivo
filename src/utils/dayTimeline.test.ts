import { describe, expect, it } from 'vitest';
import type { ParkEvent } from '../types/event';
import {
  buildDayPlan,
  countPlan,
  defaultTimelineDay,
  itemState,
  madridHour,
  timelineDayKeys,
} from './dayTimeline';

const CHECKED = '2026-09-06T06:00:00.000Z';

function ev(partial: Partial<ParkEvent> & Pick<ParkEvent, 'id' | 'startAt'>): ParkEvent {
  return {
    slug: partial.id,
    title: partial.id,
    shortDescription: '',
    venue: 'Estanque Grande',
    coordinates: [-3.68, 40.41],
    category: 'Musica',
    sourceName: 'test',
    sourceUrl: 'https://example.com',
    sourceTier: 'A',
    lastCheckedAt: CHECKED,
    expiresAt: '2026-12-31T00:00:00+01:00',
    confidence: 1,
    status: 'published',
    ...partial,
  } as ParkEvent;
}

const events: ParkEvent[] = [
  ev({
    id: 'manana-y-tarde',
    startAt: '2026-09-06T11:00:00+02:00',
    schedule: { timePrecision: 'exact', sessionTimes: ['11:00', '18:30'] },
  }),
  ev({
    id: 'solapa',
    startAt: '2026-09-06T11:30:00+02:00',
    endAt: '2026-09-06T12:30:00+02:00',
    schedule: { timePrecision: 'exact', sessionTimes: ['11:30'] },
  }),
  ev({
    id: 'expo',
    startAt: '2026-07-01T00:00:00+02:00',
    endAt: '2026-09-30T23:59:00+02:00',
    schedule: {
      timePrecision: 'unknown',
      sessionTimes: [],
      recurrence: {
        frequency: 'WEEKLY',
        interval: 1,
        byDay: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'],
        untilExclusive: '2026-10-01T00:00:00+02:00',
        excludedDays: [],
      },
    },
  }),
  ev({
    id: 'domingo-que-viene',
    startAt: '2026-09-07T10:00:00+02:00',
    schedule: { timePrecision: 'exact', sessionTimes: ['10:00'] },
  }),
  ev({ id: 'cancelado', status: 'cancelled', startAt: '2026-09-06T12:00:00+02:00' }),
];

// 2026-09-06 12:00 Madrid = 10:00Z
const MIDDAY = Date.parse('2026-09-06T10:00:00Z');

describe('buildDayPlan', () => {
  it('agrupa sesiones con hora y deja las largas en la fila de todo el día', () => {
    const plan = buildDayPlan(events, '2026-09-06', MIDDAY);
    expect(plan.timed.map((i) => i.key.split('@')[0])).toEqual([
      'manana-y-tarde',
      'solapa',
      'manana-y-tarde',
    ]);
    expect(plan.allDay.map((i) => i.eventId)).toEqual(['expo']);
    expect(plan.timed[1]!.lane).toBe(1);
    expect(plan.timed[2]!.lane).toBe(0);
    expect(plan.lanes).toBe(2);
    expect(plan.timed.map((i) => i.groupLanes)).toEqual([2, 2, 1]);
  });

  it('no incluye cancelados ni eventos de otro día', () => {
    const plan = buildDayPlan(events, '2026-09-06', MIDDAY);
    const ids = [...plan.timed, ...plan.allDay].map((i) => i.eventId);
    expect(ids).not.toContain('cancelado');
    expect(ids).not.toContain('domingo-que-viene');
  });

  it('el eje empieza y termina en horas completas de Madrid', () => {
    const plan = buildDayPlan(events, '2026-09-06', MIDDAY);
    expect(new Date(plan.axisStartMs).toISOString()).toBe('2026-09-06T09:00:00.000Z'); // 11:00
    expect(new Date(plan.axisEndMs).toISOString()).toBe('2026-09-06T18:00:00.000Z'); // 20:00
  });
});

describe('estado ahora / pasado / en curso', () => {
  it('clasifica con reloj fijo a mediodía', () => {
    const plan = buildDayPlan(events, '2026-09-06', MIDDAY);
    const [first, overlap, evening] = plan.timed;
    expect(itemState(first!, MIDDAY)).toBe('past'); // 11:00 + 60 min nominal
    expect(itemState(overlap!, MIDDAY)).toBe('ongoing');
    expect(itemState(evening!, MIDDAY)).toBe('upcoming');
    expect(itemState(plan.allDay[0]!, MIDDAY)).toBe('ongoing');
    expect(countPlan(plan, MIDDAY)).toEqual({ past: 1, ongoing: 2, upcoming: 1, total: 4 });
  });
});

describe('cambio a mañana', () => {
  it('hoy a mediodía', () => {
    const plan = buildDayPlan(events, '2026-09-06', MIDDAY);
    expect(defaultTimelineDay(plan, MIDDAY)).toBe('hoy');
  });

  it('mañana desde las 20:00 de Madrid', () => {
    const at = Date.parse('2026-09-06T18:00:00Z'); // 20:00 Madrid
    expect(madridHour(at)).toBe(20);
    const plan = buildDayPlan(events, '2026-09-06', at);
    expect(defaultTimelineDay(plan, at)).toBe('manana');
    expect(defaultTimelineDay(plan, at - 3_600_000)).toBe('hoy');
  });

  it('mañana si ya no queda nada hoy aunque sean menos de las 20:00', () => {
    const only = [events[1]!];
    const at = Date.parse('2026-09-06T11:00:00Z'); // 13:00 Madrid
    const plan = buildDayPlan(only, '2026-09-06', at);
    expect(defaultTimelineDay(plan, at)).toBe('manana');
  });

  it('día vacío no fuerza mañana antes de las 20:00', () => {
    const plan = buildDayPlan([], '2026-09-06', MIDDAY);
    expect(defaultTimelineDay(plan, MIDDAY)).toBe('hoy');
  });

  it('las claves de día usan Madrid aunque el instante sea otro día en UTC', () => {
    const at = Date.parse('2026-09-06T22:30:00Z'); // 00:30 del 7 en Madrid
    expect(timelineDayKeys(at)).toEqual({ hoy: '2026-09-07', manana: '2026-09-08' });
    expect(madridHour(at)).toBe(0);
  });
});

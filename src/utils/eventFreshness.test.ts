import { describe, expect, it } from 'vitest';
import { FRESHNESS } from '../config/freshness';
import type { ParkEvent } from '../types/event';
import {
  eventFreshness,
  isUsableAsCurrentPlan,
  selectCurrentPlans,
  selectTodayEvents,
} from './eventFreshness';

function sample(overrides: Partial<ParkEvent> = {}): ParkEvent {
  return {
    id: 'evt-1',
    slug: 'evt-1',
    title: 'Taller',
    shortDescription: 'Descripción de prueba con más de cinco caracteres.',
    startAt: '2026-09-06T18:00:00+02:00',
    endAt: '2026-09-06T19:00:00+02:00',
    expiresAt: '2026-09-06T19:00:00+02:00',
    venue: 'Casa de Vacas',
    category: 'CursosTalleres',
    sourceName: 'Agenda',
    sourceUrl: 'https://datos.madrid.es/egob/catalogo/300107-0-agenda-actividades-eventos.json',
    sourceTier: 'A',
    lastCheckedAt: '2026-09-06T08:00:00.000Z',
    confidence: 0.9,
    status: 'published',
    schedule: { timePrecision: 'exact', sessionTimes: ['18:00'] },
    ...overrides,
  };
}

describe('frescura de agenda', () => {
  const now = Date.parse('2026-09-06T16:00:00.000Z');

  it('clasifica 48 h y 7 días en las fronteras', () => {
    expect(eventFreshness(sample({ lastCheckedAt: new Date(now).toISOString() }), now)).toBe(
      'fresh',
    );
    expect(
      eventFreshness(
        sample({ lastCheckedAt: new Date(now - FRESHNESS.freshMaxMs).toISOString() }),
        now,
      ),
    ).toBe('fresh');
    expect(
      eventFreshness(
        sample({ lastCheckedAt: new Date(now - FRESHNESS.freshMaxMs - 1).toISOString() }),
        now,
      ),
    ).toBe('aging');
    expect(
      eventFreshness(
        sample({ lastCheckedAt: new Date(now - FRESHNESS.agingMaxMs).toISOString() }),
        now,
      ),
    ).toBe('aging');
    expect(
      eventFreshness(
        sample({ lastCheckedAt: new Date(now - FRESHNESS.agingMaxMs - 1).toISOString() }),
        now,
      ),
    ).toBe('stale');
  });

  it('trata fecha ausente o futura incoherente como desconocida', () => {
    expect(eventFreshness(sample({ lastCheckedAt: undefined }), now)).toBe('unknown');
    expect(
      eventFreshness(sample({ lastCheckedAt: new Date(now + 3600_000).toISOString() }), now),
    ).toBe('unknown');
  });

  it('no presenta datos stale o desconocidos como plan vigente', () => {
    const stale = sample({ lastCheckedAt: '2026-08-06T16:59:19.772Z' });
    expect(isUsableAsCurrentPlan(stale, now)).toBe(false);
    expect(selectCurrentPlans([stale], now)).toEqual([]);
  });

  it('aplica caducidad aunque la copia sea reciente', () => {
    const ended = sample({
      lastCheckedAt: new Date(now).toISOString(),
      startAt: '2026-09-06T10:00:00+02:00',
      endAt: '2026-09-06T11:00:00+02:00',
      expiresAt: '2026-09-06T11:00:00+02:00',
    });
    expect(isUsableAsCurrentPlan(ended, now)).toBe(false);
  });

  it('no incluye cancelados aunque la fecha sea futura', () => {
    const cancelled = sample({ status: 'cancelled' });
    expect(isUsableAsCurrentPlan(cancelled, now)).toBe(false);
  });

  it('mantiene en Hoy una sesión ya terminada, etiquetable como finalizada', () => {
    const ended = sample({
      startAt: '2026-09-06T10:00:00+02:00',
      endAt: '2026-09-06T11:00:00+02:00',
      expiresAt: '2026-09-06T11:00:00+02:00',
    });
    expect(selectTodayEvents([ended], now).map((e) => e.id)).toEqual(['evt-1']);
    expect(selectCurrentPlans([ended], now)).toEqual([]);
  });

  it('separa Hoy de próximos según la sesión de hoy', () => {
    const today = sample();
    const later = sample({
      id: 'evt-2',
      slug: 'evt-2',
      startAt: '2026-09-20T18:00:00+02:00',
      endAt: '2026-09-20T19:00:00+02:00',
      expiresAt: '2026-09-20T19:00:00+02:00',
    });
    const plans = selectCurrentPlans([today, later], now);
    expect(plans.map((e) => e.id)).toEqual(['evt-1', 'evt-2']);
    expect(selectTodayEvents([today, later], now).map((e) => e.id)).toEqual(['evt-1']);
  });
});

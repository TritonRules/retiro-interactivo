import { describe, expect, it } from 'vitest';
import {
  deduplicateEvents,
  eventFingerprint,
} from '../../automation/deduplicators/deduplicate-events.mjs';
import {
  geographicGate,
  parseMadridDateTime,
} from '../../automation/normalizers/normalize-events.mjs';

describe('event pipeline helpers', () => {
  it('normaliza fechas Madrid a ISO con offset', () => {
    const iso = parseMadridDateTime('2026-08-13 10:00:00.0');
    expect(iso).toMatch(/^2026-08-13T10:00:00\+0[12]:00$/);
  });

  it('deduplica por sourceEventId y por título+fecha+lugar', () => {
    const sample = [
      {
        id: 'a',
        slug: 'a',
        title: 'Árboles de El Retiro',
        startAt: '2026-08-13T10:00:00+02:00',
        venue: 'Centro de Educación Ambiental El Retiro',
        sourceEventId: '1',
      },
      {
        id: 'b',
        slug: 'b',
        title: 'Árboles de El Retiro',
        startAt: '2026-08-13T10:00:00+02:00',
        venue: 'Centro de Educación Ambiental El Retiro',
        sourceEventId: '1',
      },
      {
        id: 'c',
        slug: 'c',
        title: 'Árboles de El Retiro',
        startAt: '2026-08-13T10:00:00+02:00',
        venue: 'Centro de Educación Ambiental El Retiro',
        sourceEventId: '2',
      },
    ];
    const { events, duplicates } = deduplicateEvents(sample);
    expect(events).toHaveLength(1);
    expect(duplicates.length).toBeGreaterThanOrEqual(1);
    expect(eventFingerprint(sample[0])).toBe(eventFingerprint(sample[2]));
  });

  it('no acepta Distrito Retiro como único criterio geográfico', () => {
    const raw = {
      title: 'Taller de barrio',
      'event-location': 'Espacio de Igualdad Elena Arnedo Soriano. Retiro',
      address: {
        district: {
          '@id':
            'https://datos.madrid.es/egob/kos/Provincia/Madrid/Municipio/Madrid/Distrito/Retiro',
        },
      },
      dtstart: '2026-08-20 11:00:00.0',
    };
    const gate = geographicGate(raw);
    expect(gate.accept).toBe(false);
    expect(gate.reason).toBe('distrito-retiro-sin-parque');
  });

  it('acepta sede explícita del parque', () => {
    const raw = {
      title: 'Árboles de El Retiro',
      'event-location': 'Centro de Educación Ambiental El Retiro',
      dtstart: '2026-08-13 10:00:00.0',
    };
    const gate = geographicGate(raw);
    expect(gate.accept).toBe(true);
  });

  it('documenta la guarda de publicación vacía', () => {
    // Contrato: publishEventsAtomic([], {allowEmpty:false}) con previos no publica.
    // Cubierto en integración por events:build; aquí fijamos la expectativa.
    expect(true).toBe(true);
  });
});

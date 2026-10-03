import { describe, expect, it } from 'vitest';
import {
  deduplicateEvents,
  eventFingerprint,
} from '../../automation/deduplicators/deduplicate-events.mjs';
import {
  geographicGate,
  parseMadridDateTime,
  slugify,
} from '../../automation/normalizers/normalize-events.mjs';

describe('event pipeline helpers', () => {
  it('normaliza 30/03 y 26/10 a las 10:00 Madrid', () => {
    expect(parseMadridDateTime('2026-03-30 10:00:00.0')).toBe('2026-03-30T10:00:00+02:00');
    expect(parseMadridDateTime('2026-10-26 10:00:00.0')).toBe('2026-10-26T10:00:00+01:00');
  });

  it('deduplica por sourceEventId y no borra un segundo pase a otra hora', () => {
    const sample = [
      {
        id: 'a',
        slug: 'a',
        title: 'Árboles de El Retiro',
        startAt: '2026-08-13T10:00:00+02:00',
        venue: 'Centro de Educación Ambiental El Retiro',
        sourceEventId: '1',
        schedule: { timePrecision: 'exact', sessionTimes: ['10:00'] },
      },
      {
        id: 'b',
        slug: 'b',
        title: 'Árboles de El Retiro',
        startAt: '2026-08-13T10:00:00+02:00',
        venue: 'Centro de Educación Ambiental El Retiro',
        sourceEventId: '1',
        schedule: { timePrecision: 'exact', sessionTimes: ['10:00'] },
      },
      {
        id: 'c',
        slug: 'c',
        title: 'Árboles de El Retiro',
        startAt: '2026-08-13T17:00:00+02:00',
        venue: 'Centro de Educación Ambiental El Retiro',
        sourceEventId: '2',
        schedule: { timePrecision: 'exact', sessionTimes: ['17:00'] },
      },
    ];
    const { events, duplicates } = deduplicateEvents(sample);
    expect(events).toHaveLength(2);
    expect(duplicates.length).toBeGreaterThanOrEqual(1);
    expect(eventFingerprint(sample[0])).not.toBe(eventFingerprint(sample[2]));
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

  it('usa las coordenadas oficiales del CEA El Retiro, distintas de Casa de Fieras', () => {
    const raw = {
      title: 'Árboles de El Retiro',
      'event-location': 'Centro de Educación Ambiental El Retiro',
      dtstart: '2026-08-13 10:00:00.0',
      location: { latitude: 40.409435, longitude: -3.68618 },
    };
    const gate = geographicGate(raw);
    expect(gate.accept).toBe(true);
    expect(gate.coords?.[0]).toBeCloseTo(-3.68618, 3);
    expect(gate.coords?.[1]).toBeCloseTo(40.409435, 3);
    expect(gate.reason).toBe('venue-curated');
  });

  it('no acredita lastCheckedAt al normalizar desde caché', async () => {
    const { normalizeRawEvent } = await import('../../automation/normalizers/normalize-events.mjs');
    const result = normalizeRawEvent(
      {
        title: 'Árboles de El Retiro',
        'event-location': 'Centro de Educación Ambiental El Retiro',
        dtstart: '2026-08-13 10:00:00.0',
        id: '1',
        link: 'https://www.madrid.es/',
      },
      'madrid-agenda-general',
      { name: 'Agenda', url: 'https://datos.madrid.es/' },
      { lastSuccessfulFetchAt: null },
    );
    expect(result.discarded).toBe(false);
    expect(result.event.lastCheckedAt).toBeUndefined();
  });

  it('slugify no deja guion final al truncar a 72 caracteres', () => {
    const title =
      "Desfile de clausura de la 'IV edición de Passarela Brasil Fashion Madrid'-50433809";
    const slug = slugify(title);
    expect(slug.length).toBeLessThanOrEqual(72);
    expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
});

import { describe, expect, it } from 'vitest';
import { filterEventsByQuery, parseAgendaFilters } from './eventFilters';
import type { ParkEvent } from '../types/event';

const events: ParkEvent[] = [
  {
    id: 'a',
    slug: 'a',
    title: 'Títeres',
    shortDescription: 'Función familiar de títeres en el Retiro.',
    startAt: '2026-09-06T18:30:00+02:00',
    expiresAt: '2026-09-06T20:00:00+02:00',
    venue: 'Teatro de Títeres de El Retiro',
    category: 'CuentacuentosTiteresMarionetas',
    audience: ['Familias'],
    sourceName: 'Agenda',
    sourceUrl: 'https://datos.madrid.es/egob/catalogo/300107-0-agenda-actividades-eventos.json',
    sourceTier: 'A',
    lastCheckedAt: '2026-09-06T08:00:00.000Z',
    confidence: 0.9,
    status: 'published',
  },
  {
    id: 'b',
    slug: 'b',
    title: 'Exposición',
    shortDescription: 'Exposición temporal en Casa de Vacas.',
    startAt: '2026-09-06T10:00:00+02:00',
    expiresAt: '2026-09-27T00:00:00+02:00',
    venue: 'Casa de Vacas',
    category: 'Exposiciones',
    audience: ['Todos los públicos'],
    sourceName: 'Agenda',
    sourceUrl: 'https://datos.madrid.es/egob/catalogo/300107-0-agenda-actividades-eventos.json',
    sourceTier: 'A',
    lastCheckedAt: '2026-09-06T08:00:00.000Z',
    confidence: 0.9,
    status: 'published',
  },
];

describe('filtros de agenda en cliente', () => {
  it('filtra por categoría, público y combinación', () => {
    expect(filterEventsByQuery(events, { categoria: 'Exposiciones', publico: '' })).toHaveLength(
      1,
    );
    expect(filterEventsByQuery(events, { categoria: '', publico: 'familias' })[0].id).toBe('a');
    expect(
      filterEventsByQuery(events, {
        categoria: 'CuentacuentosTiteresMarionetas',
        publico: 'FAMILIAS',
      }),
    ).toHaveLength(1);
    expect(
      filterEventsByQuery(events, { categoria: 'Exposiciones', publico: 'familias' }),
    ).toHaveLength(0);
  });

  it('normaliza acentos y una categoría desconocida deja el conjunto vacío', () => {
    expect(filterEventsByQuery(events, { categoria: '', publico: 'famílias' })).toHaveLength(1);
    expect(filterEventsByQuery(events, { categoria: 'NoExiste', publico: '' })).toHaveLength(0);
  });

  it('lee categoria y publico de la URL', () => {
    expect(parseAgendaFilters('?categoria=Exposiciones&publico=Familias')).toEqual({
      categoria: 'Exposiciones',
      publico: 'Familias',
    });
  });
});

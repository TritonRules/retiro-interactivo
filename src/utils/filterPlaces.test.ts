import { describe, expect, it } from 'vitest';
import {
  countByCategory,
  filterPlacesByCategory,
  filterServicesByCategory,
  parseCategoryParam,
} from './filterPlaces';
import { validatePlaces } from './validatePlaces';
import type { Place } from '../types/place';
import type { ParkService } from '../types/service';

const samplePlaces: Place[] = [
  {
    id: 'a',
    slug: 'a',
    name: 'A',
    category: 'cultura',
    coordinates: [-3.682, 40.414],
    shortDescription: 'Descripción corta de prueba A.',
    description: 'Descripción larga de prueba para el lugar A con suficiente texto.',
    tags: ['test'],
    sourceName: 'Test',
    sourceUrl: 'https://www.openstreetmap.org/',
    lastVerifiedAt: '2026-08-05',
    status: 'verified',
  },
  {
    id: 'b',
    slug: 'b',
    name: 'B',
    category: 'naturaleza',
    coordinates: [-3.68, 40.411],
    shortDescription: 'Descripción corta de prueba B.',
    description: 'Descripción larga de prueba para el lugar B con suficiente texto.',
    tags: ['test'],
    sourceName: 'Test',
    sourceUrl: 'https://www.openstreetmap.org/',
    lastVerifiedAt: '2026-08-05',
    status: 'verified',
  },
  {
    id: 'c',
    slug: 'c',
    name: 'C',
    category: 'cultura',
    coordinates: [-3.681, 40.415],
    shortDescription: 'Descripción corta de prueba C.',
    description: 'Descripción larga de prueba para el lugar C con suficiente texto.',
    tags: ['test'],
    sourceName: 'Test',
    sourceUrl: 'https://www.openstreetmap.org/',
    lastVerifiedAt: '2026-08-05',
    status: 'verified',
  },
];

const sampleServices: ParkService[] = [
  {
    id: 's1',
    name: 'Fuente test',
    type: 'fuente',
    coordinates: [-3.681, 40.416],
    shortDescription: 'Fuente de agua potable de prueba.',
    sourceName: 'Test',
    sourceUrl: 'https://www.openstreetmap.org/',
    lastVerifiedAt: '2026-08-05',
    status: 'verified',
  },
];

describe('filterPlacesByCategory', () => {
  it('devuelve todos con filtro todos', () => {
    expect(filterPlacesByCategory(samplePlaces, 'todos')).toHaveLength(3);
  });

  it('filtra por categoría', () => {
    const cultura = filterPlacesByCategory(samplePlaces, 'cultura');
    expect(cultura).toHaveLength(2);
    expect(cultura.every((p) => p.category === 'cultura')).toBe(true);
  });

  it('oculta lugares en filtro servicio', () => {
    expect(filterPlacesByCategory(samplePlaces, 'servicio')).toHaveLength(0);
  });
});

describe('filterServicesByCategory', () => {
  it('muestra servicios solo con filtro servicio o toggle en todos', () => {
    expect(filterServicesByCategory(sampleServices, 'servicio', false)).toHaveLength(1);
    expect(filterServicesByCategory(sampleServices, 'todos', false)).toHaveLength(0);
    expect(filterServicesByCategory(sampleServices, 'todos', true)).toHaveLength(1);
    expect(filterServicesByCategory(sampleServices, 'cultura', true)).toHaveLength(0);
  });
});

describe('countByCategory', () => {
  it('cuenta totales y por categoría incluyendo servicios', () => {
    const counts = countByCategory(samplePlaces, sampleServices);
    expect(counts.todos).toBe(4);
    expect(counts.cultura).toBe(2);
    expect(counts.naturaleza).toBe(1);
    expect(counts.servicio).toBe(1);
    expect(counts.monumento).toBe(0);
  });
});

describe('parseCategoryParam', () => {
  it('acepta categorías válidas y cae a todos', () => {
    expect(parseCategoryParam('cultura')).toBe('cultura');
    expect(parseCategoryParam('invalid')).toBe('todos');
    expect(parseCategoryParam(null)).toBe('todos');
  });
});

describe('validatePlaces', () => {
  it('acepta datos válidos', () => {
    const result = validatePlaces(samplePlaces);
    expect(result.ok).toBe(true);
  });

  it('rechaza ids duplicados', () => {
    const result = validatePlaces([samplePlaces[0], { ...samplePlaces[1], id: 'a' }]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('duplicado'))).toBe(true);
    }
  });

  it('rechaza coordenadas fuera del Retiro', () => {
    const result = validatePlaces([
      {
        ...samplePlaces[0],
        coordinates: [-3.7, 40.4],
      },
    ]);
    expect(result.ok).toBe(false);
  });
});

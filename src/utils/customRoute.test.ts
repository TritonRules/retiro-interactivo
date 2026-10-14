import { describe, expect, it } from 'vitest';
import {
  PARK_ENTRANCES,
  buildCustomRoute,
  decodeVisitParam,
  nearestNeighbourOrder,
  pathLength,
  planVisit,
  twoOpt,
  type RoutePoint,
} from './customRoute';

const pt = (key: string, lng: number, lat: number): RoutePoint => ({
  key,
  name: key,
  coordinates: [lng, lat],
});

// Puntos en una línea este-oeste dentro del parque.
const A = pt('place:a', -3.688, 40.415);
const B = pt('place:b', -3.686, 40.415);
const C = pt('place:c', -3.684, 40.415);
const D = pt('place:d', -3.682, 40.415);

describe('ordenación de Mi visita', () => {
  it('vecino más cercano recorre la línea desde el oeste', () => {
    const order = nearestNeighbourOrder([-3.6895, 40.415], [C, A, D, B]);
    expect(order.map((s) => s.key)).toEqual(['place:a', 'place:b', 'place:c', 'place:d']);
  });

  it('2-opt deshace cruces y nunca empeora', () => {
    const start: [number, number] = [-3.6895, 40.415];
    const bad = [A, C, B, D];
    const improved = twoOpt(start, bad);
    expect(pathLength(start, improved)).toBeLessThan(pathLength(start, bad));
    expect(improved.map((s) => s.key)).toEqual(['place:a', 'place:b', 'place:c', 'place:d']);
  });

  it('sin ubicación sale de la puerta que da el recorrido más corto', () => {
    const plan = planVisit([D, C], null)!;
    expect(plan.start.kind).toBe('entrance');
    for (const e of PARK_ENTRANCES) {
      const alt = pathLength(e.coordinates, nearestNeighbourOrder(e.coordinates, [D, C]));
      expect(pathLength(plan.start.coordinates, plan.stops)).toBeLessThanOrEqual(alt + 1e-6);
    }
    expect(plan.distanceMeters).toBeGreaterThan(0);
    expect(plan.minutes).toBeGreaterThan(0);
  });

  it('con ubicación empieza en el usuario', () => {
    const plan = planVisit([A, B, C, D], [-3.6815, 40.415])!;
    expect(plan.start.kind).toBe('user');
    expect(plan.stops[0].key).toBe('place:d');
  });

  it('lista vacía da null y ruta sintética conserva el orden', () => {
    expect(planVisit([], null)).toBeNull();
    const route = buildCustomRoute([B, A]);
    expect(route.stopIds).toEqual(['place:b', 'place:a']);
    expect(route.geometry.coordinates).toHaveLength(2);
  });

  it('decodifica ?visita= ignorando basura y duplicados', () => {
    expect(decodeVisitParam('place:a, service:b,place:a,foo,../x')).toEqual([
      'place:a',
      'service:b',
    ]);
    expect(decodeVisitParam(null)).toEqual([]);
  });
});

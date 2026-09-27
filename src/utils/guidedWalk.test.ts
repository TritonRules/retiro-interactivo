import { describe, expect, it } from 'vitest';
import routesData from '../data/routes.json';
import placesData from '../data/places.json';
import { haversineMeters } from './geo';
import {
  ARRIVAL_BASE_RADIUS_M,
  ARRIVAL_MAX_ACCURACY_M,
  DEMO_SPEED_M_PER_S,
  DEMO_TICK_MS,
  arrivalRadiusMeters,
  buildWalkStops,
  circlePolygon,
  demoPositionAt,
  detectArrival,
  distanceToPolylineMeters,
  elapsedMinutes,
  formatWalkDistance,
  formatWalkingTime,
  hasArrived,
  initialWalkState,
  pointAlongPolyline,
  polylineLengthMeters,
  progressLabel,
  visitedCount,
  walkReducer,
  walkingMinutes,
  type WalkState,
} from './guidedWalk';

type LngLat = [number, number];

const line: LngLat[] = [
  [-3.6886, 40.4152],
  [-3.6846, 40.4152],
  [-3.6846, 40.4172],
];

const stops = buildWalkStops(
  [
    { id: 'a', name: 'A', coordinates: [-3.6886, 40.4152] },
    { id: 'b', name: 'B', coordinates: [-3.6846, 40.4152] },
    { id: 'c', name: 'C', coordinates: [-3.6846, 40.4172] },
  ],
  line,
);

function started(total = 3): WalkState {
  return walkReducer(initialWalkState, { type: 'start', total, now: 0 });
}

describe('tiempos y distancias', () => {
  it('estima minutos a ~4,5 km/h', () => {
    expect(walkingMinutes(0)).toBe(0);
    expect(walkingMinutes(30)).toBe(1);
    expect(walkingMinutes(750)).toBe(10);
    expect(formatWalkingTime(750)).toBe('~10 min a pie');
    expect(formatWalkingTime(20)).toBe('~1 min a pie');
    expect(formatWalkingTime(4500)).toBe('~1 h a pie');
  });

  it('redondea la distancia del panel', () => {
    expect(formatWalkDistance(2)).toBe('5 m');
    expect(formatWalkDistance(47)).toBe('45 m');
    expect(formatWalkDistance(234)).toBe('230 m');
    expect(formatWalkDistance(1540)).toBe('1,5 km');
  });
});

describe('geometría', () => {
  it('mide la polilínea y ubica puntos sobre ella', () => {
    const length = polylineLengthMeters(line);
    expect(length).toBeGreaterThan(550);
    expect(length).toBeLessThan(600);
    expect(pointAlongPolyline(line, -5)).toEqual(line[0]);
    expect(pointAlongPolyline(line, 1e6)).toEqual(line[2]);
    const mid = pointAlongPolyline(line, 100);
    expect(haversineMeters(line[0], mid)).toBeCloseTo(100, 0);
    expect(distanceToPolylineMeters(mid, line)).toBeLessThan(0.5);
  });

  it('distancia de un punto apartado al trazado', () => {
    const off: LngLat = [-3.6866, 40.4156]; // ~44 m al norte del primer tramo
    expect(distanceToPolylineMeters(off, line)).toBeGreaterThan(40);
    expect(distanceToPolylineMeters(off, line)).toBeLessThan(48);
  });

  it('círculo de precisión cerrado y del radio pedido', () => {
    const ring = circlePolygon([-3.6835, 40.4155], 30, 16);
    expect(ring).toHaveLength(17);
    expect(ring[0]).toEqual(ring[16]);
    for (const point of ring) {
      expect(haversineMeters([-3.6835, 40.4155], point)).toBeCloseTo(30, 0);
    }
  });
});

describe('llegada a una parada', () => {
  it('radio base, desplazamiento del trazado y margen por precisión (con topes)', () => {
    expect(arrivalRadiusMeters({ routeOffsetMeters: 0 }, 5)).toBe(ARRIVAL_BASE_RADIUS_M);
    expect(arrivalRadiusMeters({ routeOffsetMeters: 56 }, 5)).toBe(81);
    expect(arrivalRadiusMeters({ routeOffsetMeters: 500 }, 5)).toBe(85);
    expect(arrivalRadiusMeters({ routeOffsetMeters: 0 }, 25)).toBe(35);
    expect(arrivalRadiusMeters({ routeOffsetMeters: 0 }, 70)).toBe(40);
  });

  it('llega dentro del radio y no fuera', () => {
    const b = stops[1];
    const near: LngLat = [b.coordinates[0] + 0.0002, b.coordinates[1]]; // ~17 m
    const far: LngLat = [b.coordinates[0] + 0.0005, b.coordinates[1]]; // ~42 m
    expect(hasArrived(b, { coordinates: near, accuracy: 8 })).toBe(true);
    expect(hasArrived(b, { coordinates: far, accuracy: 8 })).toBe(false);
  });

  it('ignora posiciones demasiado imprecisas', () => {
    expect(
      hasArrived(stops[0], {
        coordinates: stops[0].coordinates,
        accuracy: ARRIVAL_MAX_ACCURACY_M + 1,
      }),
    ).toBe(false);
    expect(hasArrived(stops[0], { coordinates: stops[0].coordinates, accuracy: NaN })).toBe(false);
  });

  it('solo cuenta la siguiente parada, en orden', () => {
    const state = started();
    expect(
      detectArrival(state, stops, { coordinates: stops[1].coordinates, accuracy: 5 }),
    ).toBeNull();
    expect(detectArrival(state, stops, { coordinates: stops[0].coordinates, accuracy: 5 })).toBe(0);
    expect(
      detectArrival(initialWalkState, stops, { coordinates: stops[0].coordinates, accuracy: 5 }),
    ).toBeNull();
  });
});

describe('progreso del paseo', () => {
  it('avanza al llegar y completa en la última', () => {
    let state = started();
    expect(progressLabel(state)).toBe('Parada 1 de 3');
    state = walkReducer(state, { type: 'arrive', index: 0, now: 1 });
    expect(state.index).toBe(1);
    expect(state.lastArrivedIndex).toBe(0);
    expect(progressLabel(state)).toBe('Parada 2 de 3');
    // Llegada repetida o fuera de orden: sin efecto.
    expect(walkReducer(state, { type: 'arrive', index: 0, now: 2 })).toBe(state);
    state = walkReducer(state, { type: 'arrive', index: 1, now: 2 });
    state = walkReducer(state, { type: 'arrive', index: 2, now: 60_000 * 42 });
    expect(state.phase).toBe('completed');
    expect(visitedCount(state)).toBe(3);
    expect(elapsedMinutes(state)).toBe(42);
    expect(progressLabel(state)).toBe('Parada 3 de 3');
  });

  it('saltar y volver atrás manualmente', () => {
    let state = started();
    state = walkReducer(state, { type: 'previous' });
    expect(state.index).toBe(0);
    state = walkReducer(state, { type: 'skip', now: 1 });
    state = walkReducer(state, { type: 'skip', now: 2 });
    expect(state.index).toBe(2);
    state = walkReducer(state, { type: 'previous' });
    expect(state.index).toBe(1);
    state = walkReducer(state, { type: 'skip', now: 3 });
    state = walkReducer(state, { type: 'skip', now: 4 });
    expect(state.phase).toBe('completed');
    expect(visitedCount(state)).toBe(0);
  });

  it('terminar vuelve al estado inicial; ruta sin paradas no arranca', () => {
    expect(walkReducer(started(), { type: 'finish' })).toEqual(initialWalkState);
    expect(walkReducer(initialWalkState, { type: 'start', total: 0, now: 0 }).phase).toBe('idle');
  });
});

describe('modo demostración con las rutas reales', () => {
  const places = placesData as unknown as { id: string; name: string; coordinates: LngLat }[];
  const byId = new Map(places.map((place) => [place.id, place]));

  it('empieza en el inicio y termina al final del trazado', () => {
    const start = demoPositionAt(line, 0);
    expect(start.position.coordinates).toEqual(line[0]);
    expect(start.done).toBe(false);
    const end = demoPositionAt(line, 1e7);
    expect(end.done).toBe(true);
    expect(end.position.coordinates).toEqual(line[2]);
  });

  for (const route of routesData as unknown as {
    slug: string;
    stopIds: string[];
    geometry: { coordinates: LngLat[] };
  }[]) {
    it(`recorre «${route.slug}» y llega a todas las paradas en orden`, () => {
      const coords = route.geometry.coordinates;
      const walkStops = buildWalkStops(
        route.stopIds.map((id) => byId.get(id)!),
        coords,
      );
      let state = walkReducer(initialWalkState, { type: 'start', total: walkStops.length, now: 0 });
      const arrivals: number[] = [];
      const totalMs = (polylineLengthMeters(coords) / DEMO_SPEED_M_PER_S) * 1000 + DEMO_TICK_MS;
      for (let t = 0; t <= totalMs && state.phase === 'active'; t += DEMO_TICK_MS) {
        const { position } = demoPositionAt(coords, t);
        const index = detectArrival(state, walkStops, position);
        if (index !== null) {
          arrivals.push(index);
          state = walkReducer(state, { type: 'arrive', index, now: t });
        }
      }
      expect(arrivals).toEqual(walkStops.map((_, i) => i));
      expect(state.phase).toBe('completed');
    });
  }
});

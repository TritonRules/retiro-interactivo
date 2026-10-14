/**
 * «Mi visita»: ruta propia a partir de favoritos. Orden por vecino más cercano
 * desde la ubicación del usuario (o la entrada más conveniente) y mejora 2-opt.
 * Distancias en línea recta corregidas por un factor de rodeo: es orientativo.
 */
import { haversineMeters } from './geo';
import { walkingMinutes } from './guidedWalk';
import type { ParkRoute } from '../types/route';

type LngLat = [number, number];

export interface RoutePoint {
  key: string;
  name: string;
  coordinates: LngLat;
}

export interface ParkEntrance {
  id: string;
  name: string;
  coordinates: LngLat;
}

/** Puertas principales del Retiro (coordenadas aproximadas). */
export const PARK_ENTRANCES: ParkEntrance[] = [
  { id: 'puerta-de-espana', name: 'Puerta de España', coordinates: [-3.688628, 40.416676] },
  { id: 'puerta-de-felipe-iv', name: 'Puerta de Felipe IV', coordinates: [-3.6886925, 40.4152748] },
  {
    id: 'puerta-independencia',
    name: 'Puerta de la Independencia',
    coordinates: [-3.6866, 40.4199],
  },
  { id: 'puerta-odonnell', name: "Puerta de O'Donnell", coordinates: [-3.6766, 40.4207] },
  { id: 'puerta-nino-jesus', name: 'Puerta del Niño Jesús', coordinates: [-3.6763, 40.4113] },
  { id: 'puerta-angel-caido', name: 'Puerta del Ángel Caído', coordinates: [-3.6823, 40.4082] },
  { id: 'puerta-de-murillo', name: 'Puerta de Murillo', coordinates: [-3.6894, 40.4096] },
];

/** Los caminos del parque no van en línea recta: ~25 % más que la distancia directa. */
export const DETOUR_FACTOR = 1.25;

export function pathLength(start: LngLat | null, stops: RoutePoint[]): number {
  let total = 0;
  let prev = start;
  for (const stop of stops) {
    if (prev) total += haversineMeters(prev, stop.coordinates);
    prev = stop.coordinates;
  }
  return total;
}

export function nearestNeighbourOrder(start: LngLat, stops: RoutePoint[]): RoutePoint[] {
  const pending = [...stops];
  const out: RoutePoint[] = [];
  let current = start;
  while (pending.length) {
    let best = 0;
    let bestD = Infinity;
    pending.forEach((stop, i) => {
      const d = haversineMeters(current, stop.coordinates);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    const [next] = pending.splice(best, 1);
    out.push(next);
    current = next.coordinates;
  }
  return out;
}

/** 2-opt para un camino abierto con origen fijo (el final queda libre). */
export function twoOpt(start: LngLat, stops: RoutePoint[], maxPasses = 50): RoutePoint[] {
  let route = [...stops];
  if (route.length < 3) return route;
  const d = (a: LngLat, b: LngLat) => haversineMeters(a, b);
  const at = (i: number): LngLat => (i < 0 ? start : route[i].coordinates);
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let improved = false;
    for (let i = 0; i < route.length - 1; i += 1) {
      for (let k = i + 1; k < route.length; k += 1) {
        // Invertir route[i..k]: cambia la arista (i-1,i) y, si existe, (k,k+1).
        const before = d(at(i - 1), at(i)) + (k + 1 < route.length ? d(at(k), at(k + 1)) : 0);
        const after = d(at(i - 1), at(k)) + (k + 1 < route.length ? d(at(i), at(k + 1)) : 0);
        if (after + 1e-6 < before) {
          route = [...route.slice(0, i), ...route.slice(i, k + 1).reverse(), ...route.slice(k + 1)];
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return route;
}

export interface PlannedVisit {
  start: { kind: 'user' | 'entrance'; id?: string; name: string; coordinates: LngLat };
  stops: RoutePoint[];
  /** Metros estimados a pie (con rodeo), desde el inicio hasta la última parada. */
  distanceMeters: number;
  minutes: number;
}

function plan(start: LngLat, stops: RoutePoint[]) {
  const ordered = twoOpt(start, nearestNeighbourOrder(start, stops));
  return { ordered, length: pathLength(start, ordered) };
}

/**
 * Ordena las paradas. Con ubicación (dentro del parque) se sale desde ahí; si no,
 * se prueba cada puerta y se elige la que da el recorrido más corto.
 */
export function planVisit(
  stops: RoutePoint[],
  userLocation: LngLat | null,
  entrances: ParkEntrance[] = PARK_ENTRANCES,
): PlannedVisit | null {
  if (stops.length === 0) return null;
  let start: PlannedVisit['start'];
  let result: { ordered: RoutePoint[]; length: number };
  if (userLocation) {
    start = { kind: 'user', name: 'Tu ubicación', coordinates: userLocation };
    result = plan(userLocation, stops);
  } else {
    let best: { entrance: ParkEntrance; ordered: RoutePoint[]; length: number } | null = null;
    for (const entrance of entrances) {
      const r = plan(entrance.coordinates, stops);
      if (!best || r.length < best.length) best = { entrance, ...r };
    }
    if (!best) return null;
    start = {
      kind: 'entrance',
      id: best.entrance.id,
      name: best.entrance.name,
      coordinates: best.entrance.coordinates,
    };
    result = best;
  }
  const distanceMeters = Math.round(result.length * DETOUR_FACTOR);
  return { start, stops: result.ordered, distanceMeters, minutes: walkingMinutes(distanceMeters) };
}

export const CUSTOM_ROUTE_SLUG = 'mi-visita';

/** Ruta sintética compatible con el modo paseo (geometría en línea recta entre paradas). */
export function buildCustomRoute(stops: RoutePoint[], start: LngLat | null = null): ParkRoute {
  const coords = [...(start ? [start] : []), ...stops.map((s) => s.coordinates)];
  const distance = Math.round(pathLength(start, stops) * DETOUR_FACTOR);
  return {
    id: CUSTOM_ROUTE_SLUG,
    slug: CUSTOM_ROUTE_SLUG,
    name: 'Mi visita',
    shortDescription: 'Ruta propia con tus lugares guardados.',
    description: 'Ruta propia creada en este dispositivo a partir de tus favoritos.',
    audience: [],
    estimatedDurationMinutes: walkingMinutes(distance),
    approximateDistanceMeters: distance,
    difficulty: 'facil',
    circular: false,
    stopIds: stops.map((s) => s.key),
    geometry: { type: 'LineString', coordinates: coords },
    sourceName: 'Mi visita',
    sourceUrl: '',
    lastVerifiedAt: '',
    status: 'verified',
  };
}

/** `?visita=place:a,service:b` ⇄ lista de claves en orden. */
export function encodeVisitParam(keys: string[]): string {
  return keys.join(',');
}

export function decodeVisitParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^(place|service):[\w-]+$/.test(s))
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, 30);
}

export function findEntrance(id: string | null | undefined): ParkEntrance | null {
  return PARK_ENTRANCES.find((e) => e.id === id) ?? null;
}

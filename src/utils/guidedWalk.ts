/**
 * Modo paseo: lógica pura (sin DOM ni geolocalización) para guiar una ruta parada a parada.
 * Todo se calcula en el cliente; no se envía ni se guarda ninguna posición.
 */
import { haversineMeters } from './geo';

type LngLat = [number, number];

/** Velocidad media de paseo usada para estimar tiempos (~4,5 km/h). */
export const WALKING_SPEED_KMH = 4.5;
const WALKING_SPEED_M_PER_MIN = (WALKING_SPEED_KMH * 1000) / 60;

/** Radio base de llegada a una parada, en metros. */
export const ARRIVAL_BASE_RADIUS_M = 25;
/**
 * Algunas paradas quedan apartadas del camino (el centro del Estanque Grande está a ~56 m
 * del paseo). Se suma esa distancia al radio, con tope, para poder «llegar» sin salir del trazado.
 */
export const ARRIVAL_MAX_ROUTE_OFFSET_M = 60;
/** Margen extra, con tope, cuando el GPS informa de poca precisión. */
export const ARRIVAL_MAX_ACCURACY_SLACK_M = 15;
/** Por encima de esta precisión la posición se muestra, pero no marca llegadas. */
export const ARRIVAL_MAX_ACCURACY_M = 75;

/** Velocidad del modo demostración (acelerada respecto a un paseo real). */
export const DEMO_SPEED_M_PER_S = 12;
export const DEMO_TICK_MS = 1000;
export const DEMO_ACCURACY_M = 6;

export function walkingMinutes(meters: number): number {
  if (!Number.isFinite(meters) || meters <= 0) return 0;
  return Math.max(1, Math.round(meters / WALKING_SPEED_M_PER_MIN));
}

export function formatWalkingTime(meters: number): string {
  const minutes = walkingMinutes(meters);
  if (minutes <= 1) return '~1 min a pie';
  if (minutes < 60) return `~${minutes} min a pie`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `~${h} h a pie` : `~${h} h ${m} min a pie`;
}

/** Distancia en metros con redondeo amable para el panel (5 m / 10 m). */
export function formatWalkDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) {
    const step = meters < 100 ? 5 : 10;
    return `${Math.max(step, Math.round(meters / step) * step)} m`;
  }
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

/* ---------- Geometría plana local (suficiente a escala de un parque) ---------- */

function metersPerDegree(lat: number): { x: number; y: number } {
  return { x: 111320 * Math.cos((lat * Math.PI) / 180), y: 110574 };
}

/** Distancia mínima de un punto a un segmento, en metros. */
export function distanceToSegmentMeters(point: LngLat, a: LngLat, b: LngLat): number {
  const k = metersPerDegree(point[1]);
  const px = (point[0] - a[0]) * k.x;
  const py = (point[1] - a[1]) * k.y;
  const bx = (b[0] - a[0]) * k.x;
  const by = (b[1] - a[1]) * k.y;
  const len2 = bx * bx + by * by;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  return Math.hypot(px - t * bx, py - t * by);
}

/** Distancia mínima de un punto a una polilínea, en metros. */
export function distanceToPolylineMeters(point: LngLat, line: LngLat[]): number {
  if (line.length === 0) return Infinity;
  if (line.length === 1) return haversineMeters(point, line[0]);
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i += 1) {
    best = Math.min(best, distanceToSegmentMeters(point, line[i], line[i + 1]));
  }
  return best;
}

export function polylineLengthMeters(line: LngLat[]): number {
  let total = 0;
  for (let i = 0; i < line.length - 1; i += 1) total += haversineMeters(line[i], line[i + 1]);
  return total;
}

/** Punto situado a `distance` metros desde el inicio de la polilínea (acotado a sus extremos). */
export function pointAlongPolyline(line: LngLat[], distance: number): LngLat {
  if (line.length === 0) throw new Error('Polilínea vacía');
  if (distance <= 0 || line.length === 1) return [line[0][0], line[0][1]];
  let remaining = distance;
  for (let i = 0; i < line.length - 1; i += 1) {
    const a = line[i];
    const b = line[i + 1];
    const seg = haversineMeters(a, b);
    if (seg > 0 && remaining <= seg) {
      const t = remaining / seg;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    remaining -= seg;
  }
  const last = line[line.length - 1];
  return [last[0], last[1]];
}

/* ---------- Paradas y llegada ---------- */

export interface WalkStop {
  id: string;
  name: string;
  coordinates: LngLat;
  /** Distancia de la parada al trazado de la ruta, en metros. */
  routeOffsetMeters: number;
}

export function buildWalkStops(
  stops: { id: string; name: string; coordinates: LngLat }[],
  line: LngLat[],
): WalkStop[] {
  return stops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    coordinates: stop.coordinates,
    routeOffsetMeters: line.length ? distanceToPolylineMeters(stop.coordinates, line) : 0,
  }));
}

/** Radio efectivo de llegada para una parada con la precisión GPS actual. */
export function arrivalRadiusMeters(
  stop: Pick<WalkStop, 'routeOffsetMeters'>,
  accuracy: number,
): number {
  const offset = Math.min(Math.max(stop.routeOffsetMeters, 0), ARRIVAL_MAX_ROUTE_OFFSET_M);
  const slack = Math.min(Math.max((accuracy || 0) - 15, 0), ARRIVAL_MAX_ACCURACY_SLACK_M);
  return ARRIVAL_BASE_RADIUS_M + offset + slack;
}

export interface WalkPosition {
  coordinates: LngLat;
  accuracy: number;
}

export function hasArrived(stop: WalkStop, position: WalkPosition): boolean {
  if (!Number.isFinite(position.accuracy) || position.accuracy > ARRIVAL_MAX_ACCURACY_M)
    return false;
  return (
    haversineMeters(position.coordinates, stop.coordinates) <=
    arrivalRadiusMeters(stop, position.accuracy)
  );
}

/* ---------- Estado del paseo ---------- */

export type WalkPhase = 'idle' | 'active' | 'completed';

export interface WalkState {
  phase: WalkPhase;
  /** Índice de la siguiente parada. */
  index: number;
  total: number;
  visited: boolean[];
  /** Última parada a la que se llegó (para anunciarla y abrir su ficha). */
  lastArrivedIndex: number | null;
  startedAt: number | null;
  finishedAt: number | null;
}

export type WalkAction =
  | { type: 'start'; total: number; now: number }
  | { type: 'arrive'; index: number; now: number }
  | { type: 'skip'; now: number }
  | { type: 'previous' }
  | { type: 'finish' };

export const initialWalkState: WalkState = {
  phase: 'idle',
  index: 0,
  total: 0,
  visited: [],
  lastArrivedIndex: null,
  startedAt: null,
  finishedAt: null,
};

export function walkReducer(state: WalkState, action: WalkAction): WalkState {
  switch (action.type) {
    case 'start':
      if (action.total <= 0) return initialWalkState;
      return {
        phase: 'active',
        index: 0,
        total: action.total,
        visited: Array.from({ length: action.total }, () => false),
        lastArrivedIndex: null,
        startedAt: action.now,
        finishedAt: null,
      };
    case 'arrive': {
      if (state.phase !== 'active' || action.index !== state.index) return state;
      const visited = state.visited.slice();
      visited[action.index] = true;
      const isLast = action.index >= state.total - 1;
      return {
        ...state,
        visited,
        lastArrivedIndex: action.index,
        index: isLast ? action.index : action.index + 1,
        phase: isLast ? 'completed' : 'active',
        finishedAt: isLast ? action.now : null,
      };
    }
    case 'skip': {
      if (state.phase !== 'active') return state;
      const isLast = state.index >= state.total - 1;
      return isLast
        ? { ...state, phase: 'completed', finishedAt: action.now }
        : { ...state, index: state.index + 1 };
    }
    case 'previous':
      if (state.phase !== 'active' || state.index === 0) return state;
      return { ...state, index: state.index - 1 };
    case 'finish':
      return initialWalkState;
    default:
      return state;
  }
}

/**
 * Evalúa una posición: devuelve el índice de la parada alcanzada o `null`.
 * Solo cuenta la siguiente parada, para respetar el orden de la ruta.
 */
export function detectArrival(
  state: WalkState,
  stops: WalkStop[],
  position: WalkPosition,
): number | null {
  if (state.phase !== 'active') return null;
  const stop = stops[state.index];
  if (!stop) return null;
  return hasArrived(stop, position) ? state.index : null;
}

export function progressLabel(state: Pick<WalkState, 'index' | 'total'>): string {
  return `Parada ${Math.min(state.index + 1, state.total)} de ${state.total}`;
}

export function visitedCount(state: Pick<WalkState, 'visited'>): number {
  return state.visited.filter(Boolean).length;
}

export function elapsedMinutes(state: Pick<WalkState, 'startedAt' | 'finishedAt'>): number {
  if (state.startedAt === null || state.finishedAt === null) return 0;
  return Math.max(0, Math.round((state.finishedAt - state.startedAt) / 60000));
}

/* ---------- Modo demostración ---------- */

/** Posición simulada tras `elapsedMs` recorriendo la polilínea a velocidad constante. */
export function demoPositionAt(
  line: LngLat[],
  elapsedMs: number,
  speedMetersPerSecond = DEMO_SPEED_M_PER_S,
): { position: WalkPosition; done: boolean } {
  const length = polylineLengthMeters(line);
  const travelled = (Math.max(0, elapsedMs) / 1000) * speedMetersPerSecond;
  return {
    position: { coordinates: pointAlongPolyline(line, travelled), accuracy: DEMO_ACCURACY_M },
    done: travelled >= length,
  };
}

/** Polígono aproximado (círculo) para dibujar la precisión del GPS. */
export function circlePolygon(center: LngLat, radiusMeters: number, points = 48): LngLat[] {
  const [lon, lat] = center;
  const k = metersPerDegree(lat);
  const coords: LngLat[] = [];
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    coords.push([
      lon + (radiusMeters * Math.sin(angle)) / k.x,
      lat + (radiusMeters * Math.cos(angle)) / k.y,
    ]);
  }
  return coords;
}

import type { PlaceCategory } from '../types/place';
import { haversineMeters } from './geo';

/**
 * Tamaño y densidad de los marcadores DOM según el zoom del mapa.
 *
 * Los `maplibregl.Marker` son elementos HTML con tamaño fijo en píxeles: sin ajuste,
 * al alejar el mapa se amontonan. Aquí (1) se encoge el icono con el zoom y (2) se
 * resuelven solapes en pantalla: gana el de mayor prioridad y el resto pasa a punto
 * pequeño (sigue siendo pulsable y accesible; al tocarlo el mapa se acerca).
 */

/** Zoom a partir del cual los iconos se ven a tamaño completo. */
export const MARKER_FULL_SIZE_ZOOM = 16;
/** Zoom en el que los iconos alcanzan su tamaño mínimo. */
export const MARKER_MIN_SIZE_ZOOM = 14;
/** Escala mínima del icono (34 px → ~20 px). */
export const MARKER_MIN_SCALE = 0.6;
/** Lado visual del icono a tamaño completo, en px (ver `.place-marker__shape`). */
export const MARKER_BASE_SIZE = 34;
/** Zoom desde el que se rotulan los nombres propios de los servicios. */
export const MARKER_LABEL_ZOOM = 17;
/** Separación mínima entre iconos visibles, en px. */
export const MARKER_COLLISION_GAP = 4;

export function markerScaleForZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  if (zoom >= MARKER_FULL_SIZE_ZOOM) return 1;
  if (zoom <= MARKER_MIN_SIZE_ZOOM) return MARKER_MIN_SCALE;
  const t = (zoom - MARKER_MIN_SIZE_ZOOM) / (MARKER_FULL_SIZE_ZOOM - MARKER_MIN_SIZE_ZOOM);
  return Math.round((MARKER_MIN_SCALE + t * (1 - MARKER_MIN_SCALE)) * 1000) / 1000;
}

/**
 * Prioridad de categoría: los lugares icónicos ganan; los servicios ceden primero.
 * Las estatuas quedan por debajo de monumentos y paseos: son muchas y pequeñas, y
 * además aparecen por tramos de zoom (`mapMinZoom`, ver `isHiddenAtZoom`).
 */
const CATEGORY_PRIORITY: Record<PlaceCategory, number> = {
  iconico: 100,
  monumento: 80,
  cultura: 70,
  familias: 60,
  paseo: 50,
  escultura: 45,
  naturaleza: 40,
  acceso: 30,
  servicio: 20,
};
export const SERVICE_MARKER_PRIORITY = 10;

export function placeMarkerPriority(category: PlaceCategory): number {
  return CATEGORY_PRIORITY[category] ?? 0;
}

/**
 * Oculto por zoom: el marcador tiene un zoom mínimo y el mapa está por debajo.
 * Un marcador fijado (seleccionado) no se oculta nunca.
 */
export function isHiddenAtZoom(zoom: number, minZoom?: number, pinned?: boolean): boolean {
  if (pinned || minZoom === undefined || !Number.isFinite(zoom)) return false;
  return zoom < minZoom;
}

export interface CollisionItem {
  id: string;
  x: number;
  y: number;
  priority: number;
  /** Seleccionado o parte de la ruta activa: siempre visible y a tamaño completo. */
  pinned?: boolean;
}

/**
 * Colisión voraz en pantalla: se recorren por prioridad (fijados primero) y se
 * conserva un icono si no se solapa con ninguno ya conservado. Devuelve los ids
 * que deben mostrarse como punto. Determinista ante empates (orden por id).
 */
export function resolveMarkerCollisions(
  items: CollisionItem[],
  scale: number,
  gap = MARKER_COLLISION_GAP,
): Set<string> {
  const sorted = [...items].sort((a, b) => {
    const pa = a.pinned ? Number.POSITIVE_INFINITY : a.priority;
    const pb = b.pinned ? Number.POSITIVE_INFINITY : b.priority;
    if (pa !== pb) return pb - pa;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const kept: { x: number; y: number; size: number }[] = [];
  const collapsed = new Set<string>();
  for (const item of sorted) {
    const size = MARKER_BASE_SIZE * (item.pinned ? 1 : scale);
    const overlaps = kept.some((other) => {
      const minDistance = (size + other.size) / 2 + gap;
      return Math.abs(other.x - item.x) < minDistance && Math.abs(other.y - item.y) < minDistance;
    });
    if (overlaps && !item.pinned) {
      collapsed.add(item.id);
    } else {
      kept.push({ x: item.x, y: item.y, size });
    }
  }
  return collapsed;
}

export interface ZoomableMarker {
  id: string;
  element: HTMLElement;
  lngLat: [number, number];
  priority: number;
  pinned?: boolean;
  /** Zoom mínimo al que se muestra; por debajo se oculta (salvo fijado). */
  minZoom?: number;
}

interface MapLike {
  getZoom(): number;
  getContainer(): HTMLElement;
  project(lngLat: [number, number]): { x: number; y: number };
}

/** Aplica escala y colisiones a los marcadores DOM del mapa. */
export function applyMarkerZoom(map: MapLike, markers: ZoomableMarker[]): void {
  const zoom = map.getZoom();
  const scale = markerScaleForZoom(zoom);
  const container = map.getContainer();
  container.style.setProperty('--marker-scale', String(scale));
  if (container.dataset) container.dataset.markerLabels = String(zoom >= MARKER_LABEL_ZOOM);
  const hidden = new Set(
    markers
      .filter((marker) => isHiddenAtZoom(zoom, marker.minZoom, marker.pinned))
      .map((marker) => marker.id),
  );
  const visible = markers.filter((marker) => !hidden.has(marker.id));
  const collapsed = resolveMarkerCollisions(
    visible.map((marker) => {
      const point = map.project(marker.lngLat);
      return {
        id: marker.id,
        x: point.x,
        y: point.y,
        priority: marker.priority,
        pinned: marker.pinned,
      };
    }),
    scale,
  );
  for (const marker of markers) {
    const isHidden = hidden.has(marker.id);
    const wasHidden = marker.element.dataset.markerState === 'hidden';
    const isDot = !isHidden && collapsed.has(marker.id);
    marker.element.classList.toggle('is-hidden', isHidden);
    marker.element.classList.toggle('is-dot', isDot);
    marker.element.dataset.markerState = isHidden ? 'hidden' : isDot ? 'dot' : 'full';
    // Oculto por zoom: fuera del árbol de accesibilidad y del orden de tabulación.
    if (isHidden && !wasHidden) {
      marker.element.setAttribute('aria-hidden', 'true');
      marker.element.setAttribute('tabindex', '-1');
    } else if (!isHidden && wasHidden) {
      marker.element.removeAttribute('aria-hidden');
      marker.element.removeAttribute('tabindex');
    }
  }
}

/* ---------- Eventos de la agenda ---------- */

/**
 * Prioridad de los eventos: solo se pintan si el usuario activa «Eventos», así que
 * ganan a cualquier lugar (también a los icónicos). Un grupo con más actividades
 * gana a uno con menos; el bono está acotado para no desbordar el orden.
 */
export const EVENT_MARKER_PRIORITY = 110;

export function eventGroupPriority(count: number): number {
  return EVENT_MARKER_PRIORITY + Math.min(Math.max(count, 1), 9);
}

/** Radio en metros dentro del cual varios eventos se agrupan en un único marcador. */
export const EVENT_GROUP_RADIUS_METERS = 30;

export interface EventGroup<T> {
  /** Estable mientras no cambie el primer evento del grupo. */
  id: string;
  /** Coordenadas del primer evento (el lugar de la sede, no un centroide que caiga en medio). */
  coordinates: [number, number];
  events: T[];
}

/**
 * Agrupa los eventos que comparten sede (misma coordenada o a pocos metros): en la
 * agenda real hay sedes con nueve actividades a la vez y sus marcadores quedaban
 * apilados en el mismo punto. Conserva el orden de entrada dentro de cada grupo (la
 * lista llega ordenada por próxima sesión) y el orden de los grupos por su primer
 * evento.
 */
export function groupEventsByLocation<T extends { id: string; coordinates: [number, number] }>(
  events: T[],
  radiusMeters = EVENT_GROUP_RADIUS_METERS,
): EventGroup<T>[] {
  const groups: EventGroup<T>[] = [];
  for (const event of events) {
    const group = groups.find(
      (candidate) => haversineMeters(candidate.coordinates, event.coordinates) <= radiusMeters,
    );
    if (group) group.events.push(event);
    else groups.push({ id: `events:${event.id}`, coordinates: event.coordinates, events: [event] });
  }
  return groups;
}

/* ---------- Paradas numeradas de la ruta activa ---------- */

/**
 * Las paradas no se pliegan nunca (el orden importa), pero encogen menos que los
 * iconos: 28 px a zoom ≥ 16 y 22 px a zoom ≤ 14. El número mantiene su tamaño de letra.
 */
export const STOP_MARKER_BASE_SIZE = 28;
export const STOP_MARKER_MIN_SCALE = 0.8;
/** Separación mínima entre paradas en pantalla, en px. */
export const STOP_MARKER_GAP = 2;

/** Escala de las paradas, en el mismo tramo de zoom que los iconos (14 → 16). */
export function stopScaleForZoom(zoom: number): number {
  const t = (markerScaleForZoom(zoom) - MARKER_MIN_SCALE) / (1 - MARKER_MIN_SCALE);
  return Math.round((STOP_MARKER_MIN_SCALE + t * (1 - STOP_MARKER_MIN_SCALE)) * 1000) / 1000;
}

export interface StopPoint {
  x: number;
  y: number;
  /** Seleccionada o siguiente parada del paseo: tamaño completo. */
  pinned?: boolean;
  /**
   * Obstáculo que no es una parada (el punto del usuario): no se mueve nunca y
   * aparta a cualquier parada, también a la fijada, para que no tape su número.
   */
  obstacle?: boolean;
  /** Diámetro en px; por defecto, el de la insignia de parada a la escala dada. */
  size?: number;
}

/** Diámetro visual del punto del usuario (22 px + anillo), ver `.place-marker--user`. */
export const USER_MARKER_SIZE = 26;

export interface StopOffset {
  dx: number;
  dy: number;
}

/**
 * Separa en pantalla las paradas que se solapan para que todos los números se lean.
 * Relajación simple por pares: cada par demasiado cercano se empuja a lo largo de la
 * línea que une sus centros (o en diagonal si coinciden) hasta tocarse. La parada
 * fijada no cede ante otras paradas, pero sí ante un obstáculo (el punto del usuario);
 * el desplazamiento se limita a `maxOffset` para que ninguna se aleje de su sitio.
 * Devuelve un desplazamiento por punto (cero en los obstáculos). Determinista.
 */
export function spreadOverlappingStops(
  points: StopPoint[],
  scale: number,
  { gap = STOP_MARKER_GAP, maxOffset = STOP_MARKER_BASE_SIZE, iterations = 12 } = {},
): StopOffset[] {
  const size = points.map((p) => p.size ?? STOP_MARKER_BASE_SIZE * (p.pinned ? 1 : scale));
  const pos = points.map((p) => ({ x: p.x, y: p.y }));
  const clamp = (i: number) => {
    const dx = pos[i].x - points[i].x;
    const dy = pos[i].y - points[i].y;
    const length = Math.hypot(dx, dy);
    if (length > maxOffset) {
      pos[i].x = points[i].x + (dx / length) * maxOffset;
      pos[i].y = points[i].y + (dy / length) * maxOffset;
    }
  };
  for (let iter = 0; iter < iterations; iter += 1) {
    let moved = false;
    for (let i = 0; i < pos.length; i += 1) {
      for (let j = i + 1; j < pos.length; j += 1) {
        const minDistance = (size[i] + size[j]) / 2 + gap;
        let dx = pos[j].x - pos[i].x;
        let dy = pos[j].y - pos[i].y;
        let distance = Math.hypot(dx, dy);
        if (distance >= minDistance - 0.01) continue;
        if (distance < 0.01) {
          // Misma posición: la parada posterior se aparta en diagonal abajo-derecha.
          dx = Math.SQRT1_2;
          dy = Math.SQRT1_2;
          distance = 1;
        } else {
          dx /= distance;
          dy /= distance;
        }
        const push = minDistance - Math.max(distance, 0);
        const obstacleI = Boolean(points[i].obstacle);
        const obstacleJ = Boolean(points[j].obstacle);
        if (obstacleI && obstacleJ) continue;
        // Ante un obstáculo cede la parada, aunque esté fijada; entre paradas, la no fijada.
        const fixedI = obstacleI || (!obstacleJ && Boolean(points[i].pinned));
        const fixedJ = obstacleJ || (!obstacleI && Boolean(points[j].pinned));
        if (fixedI && fixedJ) continue;
        const shareI = fixedI ? 0 : fixedJ ? 1 : 0.5;
        const shareJ = 1 - shareI;
        pos[i].x -= dx * push * shareI;
        pos[i].y -= dy * push * shareI;
        pos[j].x += dx * push * shareJ;
        pos[j].y += dy * push * shareJ;
        clamp(i);
        clamp(j);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return pos.map((p, i) => ({
    dx: Math.round((p.x - points[i].x) * 10) / 10,
    dy: Math.round((p.y - points[i].y) * 10) / 10,
  }));
}

export interface StopMarkerLike {
  getElement(): HTMLElement;
  getLngLat(): { lng: number; lat: number };
  setOffset(offset: [number, number]): unknown;
}

/**
 * Aplica escala y separación a las paradas: `--stop-scale` en el contenedor y un
 * `offset` de MapLibre por parada (mueve también el área táctil de 44 px).
 * Selección y siguiente parada del paseo van fijadas a tamaño completo.
 */
export function applyStopMarkerLayout(
  map: MapLike,
  stops: StopMarkerLike[],
  /** Posición del punto del usuario, si está en el mapa: las paradas se apartan de él. */
  userLngLat?: [number, number] | null,
): void {
  const scale = stopScaleForZoom(map.getZoom());
  map.getContainer().style.setProperty('--stop-scale', String(scale));
  if (stops.length === 0) return;
  const points: StopPoint[] = stops.map((stop) => {
    const el = stop.getElement();
    const { lng, lat } = stop.getLngLat();
    const point = map.project([lng, lat]);
    return {
      x: point.x,
      y: point.y,
      pinned: el.classList.contains('is-active') || el.classList.contains('is-next'),
    };
  });
  if (userLngLat) {
    points.push({ ...map.project(userLngLat), obstacle: true, size: USER_MARKER_SIZE });
  }
  const offsets = spreadOverlappingStops(points, scale);
  stops.forEach((stop, index) => {
    const { dx, dy } = offsets[index];
    stop.setOffset([dx, dy]);
    stop.getElement().dataset.stopShifted = dx !== 0 || dy !== 0 ? 'true' : 'false';
  });
}

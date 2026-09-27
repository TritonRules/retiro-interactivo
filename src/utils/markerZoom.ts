import type { PlaceCategory } from '../types/place';

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
/** Separación mínima entre iconos visibles, en px. */
export const MARKER_COLLISION_GAP = 4;

export function markerScaleForZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  if (zoom >= MARKER_FULL_SIZE_ZOOM) return 1;
  if (zoom <= MARKER_MIN_SIZE_ZOOM) return MARKER_MIN_SCALE;
  const t = (zoom - MARKER_MIN_SIZE_ZOOM) / (MARKER_FULL_SIZE_ZOOM - MARKER_MIN_SIZE_ZOOM);
  return Math.round((MARKER_MIN_SCALE + t * (1 - MARKER_MIN_SCALE)) * 1000) / 1000;
}

/** Prioridad de categoría: los lugares icónicos ganan; los servicios ceden primero. */
const CATEGORY_PRIORITY: Record<PlaceCategory, number> = {
  iconico: 100,
  monumento: 80,
  cultura: 70,
  familias: 60,
  paseo: 50,
  naturaleza: 40,
  acceso: 30,
  servicio: 20,
};
export const SERVICE_MARKER_PRIORITY = 10;

export function placeMarkerPriority(category: PlaceCategory): number {
  return CATEGORY_PRIORITY[category] ?? 0;
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
}

interface MapLike {
  getZoom(): number;
  getContainer(): HTMLElement;
  project(lngLat: [number, number]): { x: number; y: number };
}

/** Aplica escala y colisiones a los marcadores DOM del mapa. */
export function applyMarkerZoom(map: MapLike, markers: ZoomableMarker[]): void {
  const scale = markerScaleForZoom(map.getZoom());
  map.getContainer().style.setProperty('--marker-scale', String(scale));
  const collapsed = resolveMarkerCollisions(
    markers.map((marker) => {
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
    const isDot = collapsed.has(marker.id);
    marker.element.classList.toggle('is-dot', isDot);
    marker.element.dataset.markerState = isDot ? 'dot' : 'full';
  }
}

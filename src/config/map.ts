/**
 * Configuración cartográfica centralizada.
 * Estilo OpenFreeMap: https://openfreemap.org/quick_start/
 */
export const OPENFREEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Centro aproximado del Parque del Retiro [lon, lat]. */
export const RETIRO_CENTER: [number, number] = [-3.6835, 40.4155];

export const DEFAULT_ZOOM = 15.2;
export const MIN_ZOOM = 13.5;
export const MAX_ZOOM = 19;

/**
 * Límites máximos de navegación del mapa (LngLatBoundsLike: SW, NE).
 * Evitan alejarse de forma absurda del área útil del parque.
 */
export const MAP_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-3.705, 40.395],
  [-3.655, 40.44],
];

/**
 * Bounding box para validar que un punto cae dentro del Retiro (margen razonable).
 * [minLon, minLat, maxLon, maxLat]
 */
export const RETIRO_PLACE_BOUNDS = {
  minLon: -3.692,
  minLat: 40.408,
  maxLon: -3.675,
  maxLat: 40.424,
} as const;

/**
 * Bounding box ampliado para lugares de entorno inmediato (no interior del parque).
 */
export const ENTORNO_PLACE_BOUNDS = {
  minLon: -3.696,
  minLat: 40.405,
  maxLon: -3.672,
  maxLat: 40.427,
} as const;

export const MAP_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> · <a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://maplibre.org/" target="_blank" rel="noopener noreferrer">MapLibre</a>';

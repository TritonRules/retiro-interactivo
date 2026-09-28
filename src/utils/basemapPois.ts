/**
 * El mapa base (OpenFreeMap «liberty», teselas OpenMapTiles) pinta a zoom alto sus propios
 * iconos grises de cafeterías, aseos, fuentes o parques infantiles. Dentro del Retiro los
 * sustituyen los servicios de la app, así que esas clases se ocultan solo dentro del
 * contorno del parque (fuera, el mapa base queda intacto).
 */

/** `class`/`subclass` de la capa `poi` de OpenMapTiles que cubren los servicios de la app. */
export const BASEMAP_SERVICE_CLASSES = [
  'cafe',
  'bar',
  'beer',
  'pub',
  'biergarten',
  'restaurant',
  'fast_food',
  'ice_cream',
  'kiosk',
  'toilets',
  'drinking_water',
  'playground',
  'fitness_station',
  'boat_rental',
  'bicycle_parking',
  'bicycle_rental',
  'dog_park',
] as const;

type Expression = unknown[];

/** Expresión MapLibre: punto dentro del parque y de una clase cubierta por la app. */
export function parkServicePoiExpression(boundary: [number, number][][]): Expression {
  const classes = ['literal', [...BASEMAP_SERVICE_CLASSES]];
  return [
    'all',
    ['within', { type: 'Polygon', coordinates: boundary }],
    [
      'any',
      ['in', ['coalesce', ['get', 'class'], ''], classes],
      ['in', ['coalesce', ['get', 'subclass'], ''], classes],
    ],
  ];
}

/** Filtro original + exclusión de los POI de servicio del parque. */
export function withoutParkServicePois(
  original: unknown,
  boundary: [number, number][][],
): Expression {
  const exclude = ['!', parkServicePoiExpression(boundary)];
  return original ? ['all', original, exclude] : ['all', exclude];
}

interface StyleLayerLike {
  id: string;
  'source-layer'?: string;
  filter?: unknown;
}

interface MapLike {
  getStyle(): { layers?: StyleLayerLike[] } | undefined;
  setFilter(layerId: string, filter: unknown): unknown;
}

const originalFilters = new WeakMap<object, Map<string, unknown>>();

/**
 * Oculta (o vuelve a mostrar) los POI de servicio del mapa base dentro del parque.
 * Idempotente; si el estilo no admite el filtro, se deja el mapa base como estaba.
 */
export function setBasemapServicePoisHidden(
  map: MapLike,
  boundary: [number, number][][],
  hidden: boolean,
): void {
  const layers = map.getStyle()?.layers ?? [];
  let originals = originalFilters.get(map);
  if (!originals) {
    originals = new Map();
    originalFilters.set(map, originals);
  }
  for (const layer of layers) {
    if (layer['source-layer'] !== 'poi' || layer.id === 'poi_transit') continue;
    if (!originals.has(layer.id)) originals.set(layer.id, layer.filter);
    const original = originals.get(layer.id);
    try {
      map.setFilter(
        layer.id,
        hidden ? withoutParkServicePois(original, boundary) : (original ?? null),
      );
    } catch {
      /* estilo sin soporte para `within`: se mantiene el mapa base original */
    }
  }
}

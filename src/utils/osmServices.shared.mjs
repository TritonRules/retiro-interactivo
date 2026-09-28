/**
 * Lógica compartida (script de extracción + app) para los servicios de OpenStreetMap:
 * clasificación de etiquetas OSM, normalización, filtro por el polígono del parque y
 * deduplicación contra los servicios y lugares curados.
 *
 * Solo depende de zod: lo usan `scripts/services-osm.mjs` (Node) y los tests de Vitest.
 * Datos © colaboradores de OpenStreetMap, licencia ODbL 1.0.
 */
import { z } from 'zod';

/** Relación OSM «Parque del Retiro» (límite del parque). */
export const RETIRO_OSM_RELATION_ID = 13616929;

/**
 * Subtipos (pictograma) → tipo de servicio de la app, grupo de filtro y nombre genérico.
 * `minZoom`: zoom desde el que aparece en «Todos» con «Mostrar servicios» activo.
 */
export const SERVICE_SUBTYPES = {
  cafe: { type: 'restauracion', group: 'comer', label: 'Cafetería', generic: 'Cafetería' },
  bar: { type: 'restauracion', group: 'comer', label: 'Bar / terraza', generic: 'Bar terraza' },
  restaurante: {
    type: 'restauracion',
    group: 'comer',
    label: 'Restaurante',
    generic: 'Restaurante',
  },
  helados: { type: 'restauracion', group: 'comer', label: 'Heladería', generic: 'Heladería' },
  quiosco: { type: 'restauracion', group: 'comer', label: 'Quiosco', generic: 'Quiosco' },
  aseo: { type: 'aseo', group: 'aseos', label: 'Aseos', generic: 'Aseos públicos' },
  agua: { type: 'fuente', group: 'agua', label: 'Agua potable', generic: 'Fuente de agua potable' },
  'parque-infantil': {
    type: 'zona-infantil',
    group: 'infantil',
    label: 'Parque infantil',
    generic: 'Parque infantil',
  },
  gimnasio: {
    type: 'deporte',
    group: 'deporte',
    label: 'Gimnasio al aire libre',
    generic: 'Gimnasio al aire libre',
  },
  deporte: {
    type: 'deporte',
    group: 'deporte',
    label: 'Deporte',
    generic: 'Instalación deportiva',
  },
  informacion: {
    type: 'informacion',
    group: 'mas',
    label: 'Información',
    generic: 'Punto de información',
  },
  barcas: { type: 'otros', group: 'mas', label: 'Barcas', generic: 'Alquiler de barcas' },
  desfibrilador: {
    type: 'otros',
    group: 'mas',
    label: 'Desfibrilador',
    generic: 'Desfibrilador (DEA)',
  },
  bicis: { type: 'otros', group: 'mas', label: 'Bicicletas', generic: 'Aparcabicis' },
  'zona-canina': { type: 'otros', group: 'mas', label: 'Zona canina', generic: 'Zona canina' },
  acceso: { type: 'acceso', group: 'mas', label: 'Acceso', generic: 'Acceso' },
  otros: { type: 'otros', group: 'mas', label: 'Servicio', generic: 'Servicio' },
};

/** Grupos de los chips de filtro de servicios, en orden de aparición. */
export const SERVICE_GROUPS = ['comer', 'aseos', 'agua', 'infantil', 'deporte', 'mas'];

/** Subtipo por defecto de los servicios curados (services.json) según su tipo. */
export const SUBTYPE_BY_TYPE = {
  aseo: 'aseo',
  fuente: 'agua',
  'zona-infantil': 'parque-infantil',
  acceso: 'acceso',
  informacion: 'informacion',
  restauracion: 'cafe',
  deporte: 'deporte',
  otros: 'otros',
};

const NO_PUBLIC_ACCESS = new Set(['private', 'no', 'customers', 'permit']);

/**
 * Clasifica las etiquetas de un elemento OSM en un subtipo de servicio, o `null` si no
 * es un servicio útil para el visitante (bancos, papeleras, pistas sueltas…).
 */
export function classifyOsmTags(tags = {}) {
  const amenity = tags.amenity;
  const name = String(tags.name ?? '');
  if (tags.access && NO_PUBLIC_ACCESS.has(tags.access) && amenity !== 'cafe') {
    // Aparcabicis «solo clientes», instalaciones privadas…
    return null;
  }
  if (amenity === 'toilets') return 'aseo';
  if (amenity === 'drinking_water') return 'agua';
  if (amenity === 'ice_cream' || tags.shop === 'ice_cream') return 'helados';
  if (['cafe', 'bar', 'pub', 'biergarten', 'restaurant', 'fast_food'].includes(amenity)) {
    if (tags.cuisine === 'ice_cream' || /helader/i.test(name)) return 'helados';
    if (amenity === 'cafe') return 'cafe';
    if (amenity === 'restaurant') return 'restaurante';
    if (amenity === 'fast_food') return 'quiosco';
    return 'bar';
  }
  if (tags.shop === 'kiosk') return 'quiosco';
  if (amenity === 'boat_rental') return 'barcas';
  if (tags.shop === 'ticket' && /barca/i.test(name)) return 'barcas';
  if (tags.leisure === 'playground') return 'parque-infantil';
  if (tags.leisure === 'fitness_station') return 'gimnasio';
  if (tags.leisure === 'sports_centre' && tags.operator?.includes('Ayuntamiento')) return 'deporte';
  if (tags.leisure === 'dog_park') return 'zona-canina';
  if (
    tags.tourism === 'information' &&
    ['office', 'visitor_centre'].includes(tags.information ?? '')
  ) {
    return 'informacion';
  }
  if (tags.emergency === 'defibrillator') return 'desfibrilador';
  if (amenity === 'bicycle_rental' || amenity === 'bicycle_parking') return 'bicis';
  return null;
}

/** Nombre visible: `name` de OSM, una descripción corta o el nombre genérico en español. */
export function serviceDisplayName(tags, subtype) {
  const name = typeof tags.name === 'string' ? tags.name.trim() : '';
  if (name) return { name, named: true };
  const description = typeof tags.description === 'string' ? tags.description.trim() : '';
  if (description && description.length <= 40 && subtype === 'gimnasio') {
    return { name: description, named: true };
  }
  if (subtype === 'bicis' && tags.amenity === 'bicycle_rental') {
    return { name: 'Alquiler de bicicletas', named: false };
  }
  return { name: SERVICE_SUBTYPES[subtype].generic, named: false };
}

function cleanUrl(value) {
  if (typeof value !== 'string') return undefined;
  const url = value.trim().split(';')[0].trim();
  return /^https?:\/\//i.test(url) ? url : undefined;
}

function wheelchairValue(value) {
  return value === 'yes' || value === 'limited' || value === 'no' ? value : undefined;
}

function feeValue(value) {
  if (value === 'no') return false;
  if (value === 'yes') return true;
  return undefined;
}

/** Coordenadas [lon, lat] de un elemento Overpass (`out center`). */
export function elementCoordinates(element) {
  if (typeof element.lon === 'number' && typeof element.lat === 'number') {
    return [element.lon, element.lat];
  }
  if (element.center) return [element.center.lon, element.center.lat];
  return null;
}

const round7 = (n) => Math.round(n * 1e7) / 1e7;

/**
 * Normaliza un elemento de Overpass a un servicio de la app, o `null` si no aplica.
 * `checkedAt`: fecha (AAAA-MM-DD) de la extracción.
 */
export function normalizeOsmElement(element, { checkedAt }) {
  const tags = element.tags ?? {};
  const subtype = classifyOsmTags(tags);
  if (!subtype) return null;
  const coords = elementCoordinates(element);
  if (!coords) return null;
  const meta = SERVICE_SUBTYPES[subtype];
  const { name, named } = serviceDisplayName(tags, subtype);
  const osmId = `${element.type}/${element.id}`;
  const service = {
    id: `osm-${element.type}-${element.id}`,
    osmId,
    name,
    named,
    type: meta.type,
    subtype,
    coordinates: [round7(coords[0]), round7(coords[1])],
    lastCheckedAt: checkedAt,
  };
  const openingHours = typeof tags.opening_hours === 'string' ? tags.opening_hours.trim() : '';
  if (openingHours) service.openingHours = openingHours;
  const wheelchair = wheelchairValue(tags.wheelchair);
  if (wheelchair) service.wheelchair = wheelchair;
  const fee = feeValue(tags.fee);
  if (fee !== undefined) service.fee = fee;
  const website = cleanUrl(tags.website ?? tags['contact:website']);
  if (website) service.website = website;
  const menuUrl = cleanUrl(tags['website:menu'] ?? tags.menu ?? tags['contact:menu']);
  if (menuUrl) service.menuUrl = menuUrl;
  if (typeof tags.check_date === 'string') service.osmCheckDate = tags.check_date;
  return service;
}

/* ---------- Geometría ---------- */

/**
 * Une los tramos (ways) de una relación multipolígono en anillos cerrados.
 * `members`: miembros de Overpass con `geometry` (`out geom`). Devuelve anillos
 * [[lon, lat], …] (exteriores e interiores; la regla par-impar los resuelve).
 */
export function ringsFromRelation(members = []) {
  const segments = members
    .filter((m) => m.type === 'way' && Array.isArray(m.geometry) && m.geometry.length > 1)
    .map((m) => m.geometry.map((p) => [p.lon, p.lat]));
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  const rings = [];
  while (segments.length) {
    let ring = segments.shift();
    let guard = 0;
    while (!same(ring[0], ring[ring.length - 1]) && guard < 10000) {
      guard += 1;
      const end = ring[ring.length - 1];
      const index = segments.findIndex((s) => same(s[0], end) || same(s[s.length - 1], end));
      if (index === -1) break;
      const [next] = segments.splice(index, 1);
      ring = ring.concat(same(next[0], end) ? next.slice(1) : next.reverse().slice(1));
    }
    if (ring.length >= 4) rings.push(ring);
  }
  return rings;
}

/** Punto en polígono (par-impar sobre todos los anillos). */
export function pointInRings([x, y], rings) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function perpendicularDistance([x, y], [x1, y1], [x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Douglas-Peucker para guardar un contorno ligero (tolerancia en grados). */
export function simplifyRing(ring, tolerance = 0.00002) {
  if (ring.length <= 4) return ring;
  const keep = new Array(ring.length).fill(false);
  keep[0] = keep[ring.length - 1] = true;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let maxDistance = 0;
    let index = -1;
    for (let i = start + 1; i < end; i += 1) {
      const d = perpendicularDistance(ring[i], ring[start], ring[end]);
      if (d > maxDistance) {
        maxDistance = d;
        index = i;
      }
    }
    if (index !== -1 && maxDistance > tolerance) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }
  return ring.filter((_, i) => keep[i]).map(([lon, lat]) => [round7(lon), round7(lat)]);
}

/** Distancia en metros (haversine). */
export function distanceMeters([lon1, lat1], [lon2, lat2]) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ---------- Deduplicación ---------- */

/** `node/123` a partir de una URL de openstreetmap.org, o `null`. */
export function osmIdFromUrl(url) {
  const match = /openstreetmap\.org\/(node|way|relation)\/(\d+)/.exec(String(url ?? ''));
  return match ? `${match[1]}/${match[2]}` : null;
}

/** Radio (m) para considerar que un servicio OSM y uno curado del mismo grupo son el mismo. */
export const DEDUP_RADIUS_METERS = 25;

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Separa los servicios OSM nuevos de los que ya existen en los datos curados.
 * Criterios, en orden: (1) coincidencia manual, (2) mismo id OSM en `sourceUrl`,
 * (3) mismo grupo a ≤ 25 m de un servicio curado, (4) mismo nombre que un lugar
 * a ≤ 60 m. El curado gana siempre; del OSM se guardan los datos con los que
 * enriquecerlo (horario, accesibilidad, gratuidad, web).
 */
export function dedupeServices(osmServices, curatedServices, places = [], manualMatches = {}) {
  const curatedByOsmId = new Map();
  for (const service of curatedServices) {
    const osmId = osmIdFromUrl(service.sourceUrl);
    if (osmId) curatedByOsmId.set(osmId, service);
  }
  const placeByOsmId = new Map();
  for (const place of places) {
    const osmId = osmIdFromUrl(place.sourceUrl);
    if (osmId) placeByOsmId.set(osmId, place);
  }
  const kept = [];
  const matches = [];
  for (const service of osmServices) {
    const group = SERVICE_SUBTYPES[service.subtype].group;
    let match = null;
    const manual = manualMatches[service.osmId];
    if (manual) {
      match = { id: manual.id, kind: manual.kind ?? 'service', reason: 'manual' };
    } else if (curatedByOsmId.has(service.osmId)) {
      match = { id: curatedByOsmId.get(service.osmId).id, kind: 'service', reason: 'osm-id' };
    } else if (placeByOsmId.has(service.osmId)) {
      match = { id: placeByOsmId.get(service.osmId).id, kind: 'place', reason: 'osm-id' };
    } else {
      const near = curatedServices.find((curated) => {
        const curatedGroup = SERVICE_SUBTYPES[SUBTYPE_BY_TYPE[curated.type]].group;
        return (
          curatedGroup === group &&
          distanceMeters(curated.coordinates, service.coordinates) <= DEDUP_RADIUS_METERS
        );
      });
      if (near) match = { id: near.id, kind: 'service', reason: 'proximidad' };
      else if (service.named) {
        const name = normalizeName(service.name);
        const place = places.find(
          (p) =>
            (normalizeName(p.name) === name ||
              (p.alternativeNames ?? []).some((alt) => normalizeName(alt) === name)) &&
            distanceMeters(p.coordinates, service.coordinates) <= 60,
        );
        if (place) match = { id: place.id, kind: 'place', reason: 'nombre' };
      }
    }
    if (!match) {
      kept.push(service);
      continue;
    }
    const enrich = {};
    for (const key of ['openingHours', 'wheelchair', 'fee', 'website', 'menuUrl']) {
      if (service[key] !== undefined) enrich[key] = service[key];
    }
    matches.push({
      osmId: service.osmId,
      subtype: service.subtype,
      matchedId: match.id,
      matchedKind: match.kind,
      reason: match.reason,
      ...(Object.keys(enrich).length ? { enrich } : {}),
    });
  }
  return { services: kept, matches };
}

/** Lugar curado más cercano (≤ `maxMeters`) para dar contexto a los nombres genéricos. */
export function nearestPlaceName(coordinates, places, maxMeters = 200) {
  let best = null;
  for (const place of places) {
    if (place.area && place.area !== 'retiro') continue;
    // Las estatuas son muchas y pequeñas: como referencia se usan lugares reconocibles.
    if (place.category === 'escultura') continue;
    const d = distanceMeters(coordinates, place.coordinates);
    if (d <= maxMeters && (!best || d < best.d)) best = { d, name: place.name.split(' — ')[0] };
  }
  return best?.name;
}

/* ---------- Presentación ---------- */

const DAY_LABELS = {
  Mo: 'lun',
  Tu: 'mar',
  We: 'mié',
  Th: 'jue',
  Fr: 'vie',
  Sa: 'sáb',
  Su: 'dom',
  PH: 'festivos',
};

/**
 * Traduce un `opening_hours` sencillo de OSM a texto en español
 * («Mo-Su 10:00-20:00» → «lun–dom 10:00–20:00»). Si el valor usa sintaxis avanzada
 * (desplazamientos de festivos, meses, semanas…) se devuelve tal cual.
 */
export function formatOpeningHours(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (text === '24/7') return 'Abierto 24 horas';
  if (
    /\s[+-]\d|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|week|sunrise|sunset)\b|"/.test(
      text,
    )
  ) {
    return text;
  }
  return text
    .split(';')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) =>
      rule
        .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (d) => DAY_LABELS[d])
        .replace(/(\p{L})-(\p{L})/gu, '$1–$2')
        .replace(/(\d{2}:\d{2})-(\d{2}:\d{2})/g, '$1–$2')
        .replace(/,(?=\S)/g, ', ')
        .replace(/\boff\b/g, 'cerrado'),
    )
    .join(' · ');
}

/* ---------- Esquema del fichero generado ---------- */

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const lonLatSchema = z.tuple([z.number(), z.number()]);

/**
 * Diseño (sin uso todavía en la interfaz) para precios destacados verificados.
 * Solo se rellenaría con fuentes primarias (carta del propio local o foto fechada).
 */
export const featuredPriceSchema = z.object({
  item: z.string().min(1),
  price: z.number().nonnegative(),
  currency: z.literal('EUR'),
  checkedAt: dateSchema,
  source: z.url(),
});

export const osmServiceSchema = z.object({
  id: z.string().regex(/^osm-(node|way|relation)-\d+$/),
  osmId: z.string().regex(/^(node|way|relation)\/\d+$/),
  name: z.string().min(1),
  named: z.boolean(),
  type: z.enum([
    'aseo',
    'fuente',
    'zona-infantil',
    'acceso',
    'informacion',
    'restauracion',
    'deporte',
    'otros',
  ]),
  subtype: z.enum(Object.keys(SERVICE_SUBTYPES)),
  coordinates: lonLatSchema,
  lastCheckedAt: dateSchema,
  near: z.string().optional(),
  openingHours: z.string().optional(),
  wheelchair: z.enum(['yes', 'limited', 'no']).optional(),
  fee: z.boolean().optional(),
  website: z.url().optional(),
  menuUrl: z.url().optional(),
  osmCheckDate: z.string().optional(),
  featuredPrices: z.array(featuredPriceSchema).optional(),
});

export const osmServicesDatasetSchema = z.object({
  source: z.string(),
  license: z.literal('ODbL-1.0'),
  attribution: z.string().min(1),
  attributionUrl: z.url(),
  area: z.string(),
  extractedAt: dateSchema,
  osmBaseTimestamp: z.string().nullable(),
  counts: z.object({
    found: z.record(z.string(), z.number()),
    added: z.record(z.string(), z.number()),
    total: z.number(),
    added_total: z.number(),
  }),
  boundary: z.array(z.array(lonLatSchema).min(4)).min(1),
  services: z.array(osmServiceSchema),
  matches: z.array(
    z.object({
      osmId: z.string(),
      subtype: z.string(),
      matchedId: z.string(),
      matchedKind: z.enum(['service', 'place']),
      reason: z.string(),
      enrich: z
        .object({
          openingHours: z.string().optional(),
          wheelchair: z.enum(['yes', 'limited', 'no']).optional(),
          fee: z.boolean().optional(),
          website: z.url().optional(),
          menuUrl: z.url().optional(),
        })
        .optional(),
    }),
  ),
});

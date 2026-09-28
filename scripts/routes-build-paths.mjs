#!/usr/bin/env node
/**
 * Reconstruye la geometría de cada ruta siguiendo la red peatonal real del
 * Parque del Retiro publicada en OpenStreetMap.
 *
 * El resultado se guarda como GeoJSON estático dentro de `src/data/routes.json`:
 * la aplicación sigue sin depender de ningún servicio de routing en ejecución.
 *
 *   node scripts/routes-build-paths.mjs            # regenera y escribe
 *   node scripts/routes-build-paths.mjs --dry-run  # solo informa
 *   node scripts/routes-build-paths.mjs --only=ruta-estatuas  # solo esa ruta; las demás
 *                                                    # conservan su trazado publicado
 *
 * Las respuestas de Overpass se cachean en `.cache/` para poder repetir la
 * ejecución sin volver a consultar el servicio.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, '.cache');
const dryRun = process.argv.includes('--dry-run');
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').filter(Boolean)) : null;

const BBOX = '40.4070,-3.6920,40.4260,-3.6720';
const OVERPASS = 'https://overpass-api.de/api/interpreter';

/** Tipos de vía transitables a pie dentro del parque. */
const WALKABLE = new Set([
  'footway',
  'path',
  'pedestrian',
  'steps',
  'living_street',
  'track',
  'service',
]);

/** Penalizaciones para preferir paseos anchos frente a escaleras o viales. */
const PENALTY = { steps: 1.8, service: 1.15 };

const EARTH = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

function haversine([lon1, lat1], [lon2, lat2]) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH * Math.asin(Math.sqrt(a));
}

async function overpass(query, cacheName) {
  const cacheFile = join(cacheDir, cacheName);
  if (existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, 'utf8'));

  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(OVERPASS, {
      method: 'POST',
      body: new URLSearchParams({ data: query }),
    });
    const text = await response.text();
    if (response.ok && text.startsWith('{')) {
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(cacheFile, text);
      return JSON.parse(text);
    }
    lastError = text.slice(0, 200);
    console.warn(`Overpass ocupado (intento ${attempt}). Reintentando…`);
    await new Promise((resolve) => setTimeout(resolve, 20000));
  }
  throw new Error(`Overpass no respondió con datos: ${lastError}`);
}

/** Anillo exterior del parque, ensamblado a partir de los tramos de la relación. */
function buildParkRing(relation) {
  const pending = relation.members
    .filter((member) => member.role === 'outer' && member.geometry)
    .map((member) => member.geometry.map((point) => [point.lon, point.lat]));

  const ring = pending.shift();
  while (pending.length > 0) {
    const tail = ring[ring.length - 1];
    let bestIndex = 0;
    let bestReversed = false;
    let bestDistance = Infinity;
    pending.forEach((segment, index) => {
      const toStart = haversine(tail, segment[0]);
      const toEnd = haversine(tail, segment[segment.length - 1]);
      if (toStart < bestDistance) {
        bestDistance = toStart;
        bestIndex = index;
        bestReversed = false;
      }
      if (toEnd < bestDistance) {
        bestDistance = toEnd;
        bestIndex = index;
        bestReversed = true;
      }
    });
    const [segment] = pending.splice(bestIndex, 1);
    ring.push(...(bestReversed ? segment.reverse() : segment).slice(1));
  }
  return ring;
}

function insidePolygon([lon, lat], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function buildGraph(osm, ring) {
  const coords = new Map();
  for (const element of osm.elements) {
    if (element.type === 'node') coords.set(element.id, [element.lon, element.lat]);
  }

  const adjacency = new Map();
  const link = (from, to, weight) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push({ to, weight });
  };

  for (const element of osm.elements) {
    if (element.type !== 'way') continue;
    const tags = element.tags ?? {};
    if (!WALKABLE.has(tags.highway)) continue;
    if (tags.access === 'private' || tags.access === 'no') continue;
    if (tags.foot === 'no') continue;
    const penalty = PENALTY[tags.highway] ?? 1;

    for (let i = 0; i < element.nodes.length - 1; i += 1) {
      const a = element.nodes[i];
      const b = element.nodes[i + 1];
      const from = coords.get(a);
      const to = coords.get(b);
      if (!from || !to) continue;
      if (!insidePolygon(from, ring) || !insidePolygon(to, ring)) continue;
      const weight = haversine(from, to) * penalty;
      link(a, b, weight);
      link(b, a, weight);
    }
  }

  // Solo el componente conexo mayor: descarta fragmentos sueltos del mapeado.
  const seen = new Set();
  let largest = new Set();
  for (const start of adjacency.keys()) {
    if (seen.has(start)) continue;
    const component = new Set([start]);
    const queue = [start];
    while (queue.length > 0) {
      const current = queue.pop();
      for (const { to } of adjacency.get(current) ?? []) {
        if (component.has(to)) continue;
        component.add(to);
        queue.push(to);
      }
    }
    component.forEach((id) => seen.add(id));
    if (component.size > largest.size) largest = component;
  }

  return { coords, adjacency, nodes: [...largest] };
}

function nearestNode(point, graph) {
  let best = null;
  let bestDistance = Infinity;
  for (const id of graph.nodes) {
    const distance = haversine(point, graph.coords.get(id));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = id;
    }
  }
  return { id: best, distance: bestDistance };
}

function shortestPath(fromId, toId, graph) {
  const distances = new Map([[fromId, 0]]);
  const previous = new Map();
  const visited = new Set();
  // Cola simple: la red del parque tiene pocos miles de nodos.
  const queue = new Set([fromId]);

  while (queue.size > 0) {
    let current = null;
    let currentDistance = Infinity;
    for (const id of queue) {
      const distance = distances.get(id) ?? Infinity;
      if (distance < currentDistance) {
        currentDistance = distance;
        current = id;
      }
    }
    queue.delete(current);
    if (current === toId) break;
    visited.add(current);

    for (const { to, weight } of graph.adjacency.get(current) ?? []) {
      if (visited.has(to)) continue;
      const candidate = currentDistance + weight;
      if (candidate < (distances.get(to) ?? Infinity)) {
        distances.set(to, candidate);
        previous.set(to, current);
        queue.add(to);
      }
    }
  }

  if (!distances.has(toId)) return null;
  const path = [toId];
  while (path[0] !== fromId) {
    const step = previous.get(path[0]);
    if (step === undefined) return null;
    path.unshift(step);
  }
  return path;
}

/** Douglas-Peucker sobre coordenadas geográficas, tolerancia en metros. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const distanceToSegment = (point, start, end) => {
    const scale = Math.cos(toRad(point[1]));
    const project = ([lon, lat]) => [lon * scale * 111320, lat * 110540];
    const [px, py] = project(point);
    const [ax, ay] = project(start);
    const [bx, by] = project(end);
    const dx = bx - ax;
    const dy = by - ay;
    if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };

  let index = 0;
  let maxDistance = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = distanceToSegment(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }
  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]];
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

/**
 * Los paseos rectos largos (p. ej. el de Coches) quedan tras simplificar como un
 * único tramo; se parten en trozos iguales para que ningún tramo supere el tope
 * que usa la validación para detectar líneas rectas inventadas (450 m).
 */
const MAX_SEGMENT_METERS = 300;
function densify(points, maxMeters) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const [a, b] = [points[i - 1], points[i]];
    const pieces = Math.ceil(haversine(a, b) / maxMeters);
    for (let k = 1; k < pieces; k += 1) {
      out.push([a[0] + ((b[0] - a[0]) * k) / pieces, a[1] + ((b[1] - a[1]) * k) / pieces]);
    }
    out.push(b);
  }
  return out;
}

const osm = await overpass(
  `[out:json][timeout:120];
   (way["highway"~"^(footway|path|pedestrian|steps|living_street|track|service)$"](${BBOX}););
   (._;>;);
   out body;`,
  'osm-walkways.json',
);
const parkData = await overpass(
  `[out:json][timeout:120];
   relation["leisure"="park"]["name"="Parque del Retiro"](${BBOX});
   out geom;`,
  'osm-park.json',
);

const park = parkData.elements.find(
  (element) => element.type === 'relation' && element.tags?.name === 'Parque del Retiro',
);
if (!park) throw new Error('No se encontró la relación del Parque del Retiro en OSM');
const ring = buildParkRing(park);
const graph = buildGraph(osm, ring);
console.log(`Red peatonal: ${graph.nodes.length} nodos conectados dentro del parque`);

const routes = JSON.parse(readFileSync(join(root, 'src/data/routes.json'), 'utf8'));
const places = JSON.parse(readFileSync(join(root, 'src/data/places.json'), 'utf8'));
const placeById = new Map(places.map((place) => [place.id, place]));

let failures = 0;
if (only) {
  const unknown = [...only].filter((slug) => !routes.some((route) => route.slug === slug));
  if (unknown.length > 0) throw new Error(`--only: rutas inexistentes ${unknown.join(', ')}`);
}

for (const route of routes) {
  if (only && !only.has(route.slug)) continue;
  const stops = route.stopIds.map((id) => {
    const place = placeById.get(id);
    if (!place) throw new Error(`Ruta ${route.slug}: parada inexistente ${id}`);
    return { id, name: place.name, coordinates: place.coordinates };
  });

  const anchors = route.circular ? [...stops, stops[0]] : stops;
  const snapped = anchors.map((stop) => ({ ...stop, ...nearestNode(stop.coordinates, graph) }));

  const points = [];
  const legs = [];
  for (let i = 0; i < snapped.length - 1; i += 1) {
    const path = shortestPath(snapped[i].id, snapped[i + 1].id, graph);
    if (!path) {
      console.error(`  ✗ ${route.slug}: sin camino entre ${snapped[i].id} y ${snapped[i + 1].id}`);
      failures += 1;
      continue;
    }
    const coordinates = path.map((id) => graph.coords.get(id));
    legs.push(coordinates.reduce((total, point, index) =>
      index === 0 ? 0 : total + haversine(coordinates[index - 1], point), 0));
    points.push(...(points.length === 0 ? coordinates : coordinates.slice(1)));
  }

  const geometry = densify(simplify(points, 3), MAX_SEGMENT_METERS).map(([lon, lat]) => [
    Number(lon.toFixed(6)),
    Number(lat.toFixed(6)),
  ]);
  const length = geometry.reduce(
    (total, point, index) => (index === 0 ? 0 : total + haversine(geometry[index - 1], point)),
    0,
  );

  console.log(`\n${route.slug}`);
  snapped.forEach((stop, index) =>
    console.log(`  parada ${index + 1} ${stop.name}: enganche a ${stop.distance.toFixed(0)} m`),
  );
  console.log(`  tramos: ${legs.map((leg) => Math.round(leg)).join(' + ')}`);
  console.log(
    `  vértices ${route.geometry.coordinates.length} → ${geometry.length} · ` +
      `distancia ${route.approximateDistanceMeters} → ${Math.round(length / 10) * 10} m`,
  );

  route.geometry.coordinates = geometry;
  route.approximateDistanceMeters = Math.round(length / 10) * 10;
}

if (failures > 0) {
  console.error(`\n${failures} tramos sin camino peatonal: no se escribe nada.`);
  process.exit(1);
}

if (dryRun) {
  console.log('\n--dry-run: no se ha modificado ningún fichero.');
  process.exit(0);
}

writeFileSync(join(root, 'src/data/routes.json'), `${JSON.stringify(routes, null, 2)}\n`);

// Copias publicadas para consumo externo y caché de la PWA.
writeFileSync(join(root, 'public/data/routes.json'), `${JSON.stringify(routes, null, 2)}\n`);
const collection = {
  type: 'FeatureCollection',
  features: routes.map((route) => ({
    type: 'Feature',
    geometry: route.geometry,
    properties: {
      id: route.id,
      slug: route.slug,
      name: route.name,
      estimatedDurationMinutes: route.estimatedDurationMinutes,
      approximateDistanceMeters: route.approximateDistanceMeters,
    },
  })),
};
writeFileSync(join(root, 'public/data/routes.geojson'), `${JSON.stringify(collection, null, 2)}\n`);
console.log('\nActualizados src/data/routes.json y public/data/routes.{json,geojson}.');

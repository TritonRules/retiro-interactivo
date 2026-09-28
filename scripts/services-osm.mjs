#!/usr/bin/env node
/**
 * Extrae de OpenStreetMap (Overpass API) los servicios para visitantes dentro del
 * Parque del Retiro y escribe `src/data/services-osm.json`.
 *
 *   npm run services:osm                      # consulta Overpass y escribe el fichero
 *   npm run services:osm -- --save-raw /tmp/osm.json   # guarda además la respuesta cruda
 *   npm run services:osm -- --input /tmp/osm.json      # reconstruye sin red (reproducible)
 *   npm run services:osm -- --check           # solo informa; no escribe
 *
 * Servidor: OVERPASS_URL o, por orden, overpass-api.de y réplicas públicas.
 * Datos © colaboradores de OpenStreetMap, ODbL 1.0 (ver docs/data-sources.md).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dedupeServices,
  nearestPlaceName,
  normalizeOsmElement,
  pointInRings,
  RETIRO_OSM_RELATION_ID,
  ringsFromRelation,
  SERVICE_SUBTYPES,
  simplifyRing,
} from '../src/utils/osmServices.shared.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(root, 'src/data/services-osm.json');

const ENDPOINTS = process.env.OVERPASS_URL
  ? [process.env.OVERPASS_URL]
  : [
      'https://overpass-api.de/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];

const AREA_ID = 3600000000 + RETIRO_OSM_RELATION_ID;

/** Solo etiquetas útiles para el visitante (sin bancos, papeleras ni fuentes ornamentales). */
export const OVERPASS_QUERY = `[out:json][timeout:120];
area(id:${AREA_ID})->.park;
(
  nwr["amenity"~"^(cafe|bar|pub|biergarten|restaurant|fast_food|ice_cream|toilets|drinking_water|boat_rental|bicycle_rental|bicycle_parking|first_aid)$"](area.park);
  nwr["shop"~"^(kiosk|ice_cream|ticket)$"](area.park);
  nwr["leisure"~"^(playground|fitness_station|sports_centre|dog_park)$"](area.park);
  nwr["tourism"="information"]["information"~"^(office|visitor_centre)$"](area.park);
  nwr["emergency"="defibrillator"](area.park);
);
out center tags;
relation(${RETIRO_OSM_RELATION_ID});
out geom;`;

/**
 * Coincidencias que la distancia no resuelve: el curado tiene la coordenada de la
 * entrada del recinto y OSM la del edificio.
 */
const MANUAL_MATCHES = {
  'node/9379611673': { id: 'info-centro-ambiental', kind: 'service' },
};

function parseArgs(argv) {
  const args = { input: null, saveRaw: null, check: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--input') args.input = argv[++i];
    else if (argv[i] === '--save-raw') args.saveRaw = argv[++i];
    else if (argv[i] === '--check') args.check = true;
  }
  return args;
}

async function fetchOverpass() {
  let lastError;
  for (const endpoint of ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 150_000);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'retiro-interactivo (github.com/TritonRules/retiro-interactivo)',
        },
        body: new URLSearchParams({ data: OVERPASS_QUERY }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      console.log(`Overpass: ${endpoint} (${json.elements?.length ?? 0} elementos)`);
      return json;
    } catch (error) {
      lastError = error;
      console.warn(`Overpass no disponible en ${endpoint}: ${error.message ?? error}`);
    }
  }
  throw new Error(`Ningún servidor Overpass respondió: ${lastError?.message ?? lastError}`);
}

function madridDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(date);
}

export function buildServicesDataset(raw, { curated, places, checkedAt }) {
  const park = raw.elements.find(
    (el) => el.type === 'relation' && el.id === RETIRO_OSM_RELATION_ID && el.members,
  );
  if (!park) throw new Error('La respuesta no incluye la geometría del parque.');
  const rings = ringsFromRelation(park.members);
  if (!rings.length) throw new Error('No se pudo reconstruir el polígono del parque.');

  const outside = [];
  const normalized = [];
  const seen = new Set();
  for (const element of raw.elements) {
    if (element === park) continue;
    const service = normalizeOsmElement(element, { checkedAt });
    if (!service || seen.has(service.osmId)) continue;
    seen.add(service.osmId);
    if (!pointInRings(service.coordinates, rings)) {
      outside.push(service.osmId);
      continue;
    }
    normalized.push(service);
  }

  const { services, matches } = dedupeServices(normalized, curated, places, MANUAL_MATCHES);
  for (const service of services) {
    if (!service.named) {
      const near = nearestPlaceName(service.coordinates, places);
      if (near) service.near = near;
    }
  }
  const order = Object.keys(SERVICE_SUBTYPES);
  services.sort(
    (a, b) => order.indexOf(a.subtype) - order.indexOf(b.subtype) || a.id.localeCompare(b.id),
  );

  const counts = {};
  for (const service of normalized) counts[service.subtype] = (counts[service.subtype] ?? 0) + 1;
  const newCounts = {};
  for (const service of services)
    newCounts[service.subtype] = (newCounts[service.subtype] ?? 0) + 1;

  const presentIds = new Set(raw.elements.map((el) => `${el.type}/${el.id}`));
  const curatedMissing = curated
    .map((s) => ({
      id: s.id,
      osmId: /openstreetmap\.org\/(node|way|relation)\/(\d+)/.exec(s.sourceUrl),
    }))
    .filter((s) => s.osmId && !['acceso'].includes(curated.find((c) => c.id === s.id)?.type))
    .map((s) => ({ id: s.id, osmId: `${s.osmId[1]}/${s.osmId[2]}` }))
    .filter((s) => !presentIds.has(s.osmId));

  const boundary = rings.map((ring) => simplifyRing(ring)).sort((a, b) => b.length - a.length);

  return {
    dataset: {
      source: 'OpenStreetMap (Overpass API)',
      license: 'ODbL-1.0',
      attribution: '© colaboradores de OpenStreetMap',
      attributionUrl: 'https://www.openstreetmap.org/copyright',
      area: `relation/${RETIRO_OSM_RELATION_ID}`,
      extractedAt: checkedAt,
      osmBaseTimestamp: raw.osm3s?.timestamp_osm_base ?? null,
      counts: {
        found: counts,
        added: newCounts,
        total: normalized.length,
        added_total: services.length,
      },
      boundary,
      services,
      matches,
    },
    report: { outside, curatedMissing },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = args.input ? JSON.parse(readFileSync(args.input, 'utf8')) : await fetchOverpass();
  if (args.saveRaw) writeFileSync(args.saveRaw, JSON.stringify(raw));
  const curated = JSON.parse(readFileSync(join(root, 'src/data/services.json'), 'utf8'));
  const places = JSON.parse(readFileSync(join(root, 'src/data/places.json'), 'utf8'));
  const checkedAt = raw.osm3s?.timestamp_osm_base?.slice(0, 10) ?? madridDate();
  const { dataset, report } = buildServicesDataset(raw, { curated, places, checkedAt });

  console.log(`Servicios OSM dentro del parque: ${dataset.counts.total}`);
  console.table(
    Object.keys(SERVICE_SUBTYPES)
      .filter((k) => dataset.counts.found[k])
      .map((k) => ({
        subtipo: k,
        encontrados: dataset.counts.found[k],
        nuevos: dataset.counts.added[k] ?? 0,
        duplicados: dataset.counts.found[k] - (dataset.counts.added[k] ?? 0),
      })),
  );
  console.log(`Duplicados con datos curados: ${dataset.matches.length}`);
  for (const m of dataset.matches) {
    console.log(`  ${m.osmId} → ${m.matchedKind}:${m.matchedId} (${m.reason})`);
  }
  if (report.outside.length)
    console.log(`Fuera del polígono (descartados): ${report.outside.join(', ')}`);
  if (report.curatedMissing.length) {
    console.log(
      'Servicios curados cuyo elemento OSM no está en la extracción (fuera del polígono del parque o etiquetas no incluidas; revisar):',
    );
    for (const m of report.curatedMissing) console.log(`  ${m.id} (${m.osmId})`);
  }
  if (args.check) return;
  writeFileSync(OUTPUT, `${JSON.stringify(dataset, null, 2)}\n`);
  console.log(`OK services:osm → ${OUTPUT.replace(`${root}/`, '')}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message ?? error);
    process.exit(1);
  });
}

#!/usr/bin/env node
/**
 * Valida lugares, servicios, rutas y eventos publicados.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { validateEventList } from '../automation/validators/validate-events.mjs';
import { videosSchema } from '../src/utils/videos.shared.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const RETIRO_PLACE_BOUNDS = {
  minLon: -3.692,
  minLat: 40.408,
  maxLon: -3.675,
  maxLat: 40.424,
};
const ENTORNO_PLACE_BOUNDS = {
  minLon: -3.696,
  minLat: 40.405,
  maxLon: -3.672,
  maxLat: 40.427,
};

const placeSchema = z
  .object({
    id: z.string().min(1),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().min(1),
    alternativeNames: z.array(z.string()).optional(),
    category: z.enum([
      'iconico',
      'monumento',
      'escultura',
      'cultura',
      'naturaleza',
      'familias',
      'paseo',
      'servicio',
      'acceso',
    ]),
    coordinates: z.tuple([z.number(), z.number()]),
    shortDescription: z.string().min(10).max(220),
    description: z.string().min(20).max(900),
    tags: z.array(z.string().min(1)).min(1),
    audience: z.array(z.string()).optional(),
    recommendedDurationMinutes: z.number().optional(),
    bestFor: z.array(z.string()).optional(),
    area: z.enum(['retiro', 'entorno']).optional(),
    sourceName: z.string().min(1),
    sourceUrl: z.url(),
    sourceTier: z.enum(['A', 'B', 'C', 'D']).optional(),
    lastVerifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['verified', 'needs-review']),
    accessibility: z.array(z.string()).optional(),
    openingHoursNote: z.string().optional(),
    videos: videosSchema,
    artwork: z
      .object({
        authors: z.array(z.string().min(1)).optional(),
        date: z.string().min(1).max(60).optional(),
      })
      .strict()
      .optional(),
    additionalSources: z
      .array(z.object({ name: z.string().min(1), url: z.url() }).strict())
      .max(6)
      .optional(),
    mapMinZoom: z.number().min(13.5).max(19).optional(),
  })
  .superRefine((place, ctx) => {
    const [lon, lat] = place.coordinates;
    const b = place.area === 'entorno' ? ENTORNO_PLACE_BOUNDS : RETIRO_PLACE_BOUNDS;
    if (lon < b.minLon || lon > b.maxLon || lat < b.minLat || lat > b.maxLat) {
      ctx.addIssue({ code: 'custom', message: 'coordenadas fuera de límites', path: ['coordinates'] });
    }
  });

const serviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
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
  coordinates: z.tuple([z.number(), z.number()]).refine(
    ([lon, lat]) =>
      lon >= RETIRO_PLACE_BOUNDS.minLon &&
      lon <= RETIRO_PLACE_BOUNDS.maxLon &&
      lat >= RETIRO_PLACE_BOUNDS.minLat &&
      lat <= RETIRO_PLACE_BOUNDS.maxLat,
    { message: 'coordenadas fuera de los límites del Retiro' },
  ),
  shortDescription: z.string().min(10).max(280),
  sourceName: z.string().min(1),
  sourceUrl: z.url(),
  lastVerifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['verified', 'needs-review']),
  accessibility: z.array(z.string()).optional(),
  availabilityNote: z.string().optional(),
});

const routeSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  shortDescription: z.string().min(10),
  description: z.string().min(20),
  audience: z.array(z.string()).min(1),
  estimatedDurationMinutes: z.number().int().positive(),
  approximateDistanceMeters: z.number().int().positive(),
  difficulty: z.enum(['facil', 'moderada']),
  circular: z.boolean(),
  stopIds: z.array(z.string()).min(2),
  geometry: z.object({
    type: z.literal('LineString'),
    coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
  }),
  startPlaceId: z.string().optional(),
  endPlaceId: z.string().optional(),
  accessibilityNote: z.string().optional(),
  sourceName: z.string().min(1),
  sourceUrl: z.url(),
  lastVerifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['verified', 'needs-review']),
  videos: videosSchema,
});

function uniqueBy(field, items, label) {
  const seen = new Set();
  for (const [index, item] of items.entries()) {
    if (seen.has(item[field])) {
      console.error(`- ${label}.${index}.${field}: ${field} duplicado: ${item[field]}`);
      return false;
    }
    seen.add(item[field]);
  }
  return true;
}

function load(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const places = placeSchema.array().parse(load(join(root, 'src/data/places.json')));
const services = serviceSchema.array().parse(load(join(root, 'src/data/services.json')));
const routes = routeSchema.array().parse(load(join(root, 'src/data/routes.json')));

if (!uniqueBy('id', places, 'lugares') || !uniqueBy('slug', places, 'lugares')) process.exit(1);
if (!uniqueBy('id', services, 'servicios')) process.exit(1);
if (!uniqueBy('id', routes, 'rutas') || !uniqueBy('slug', routes, 'rutas')) process.exit(1);

if (places.length < 60 - services.length) {
  // total fichas target checked below
}
const totalFichas = places.length + services.length;
// Iteración estatuas: 38 lugares + 45 estatuas y esculturas + servicios.
if (totalFichas < 60 || totalFichas > 160) {
  fail(`Se esperaban 60–160 fichas totales, hay ${totalFichas} (${places.length} lugares + ${services.length} servicios).`);
}
if (routes.length !== 6) fail(`Se esperaban 6 rutas, hay ${routes.length}.`);

const placeIds = new Set(places.map((p) => p.id));
const placeSlugs = new Set(places.map((p) => p.slug));
const routeSlugs = new Set(routes.map((r) => r.slug));

for (const route of routes) {
  for (const stopId of route.stopIds) {
    if (!placeIds.has(stopId)) fail(`Ruta ${route.id}: stopId inexistente ${stopId}`);
  }
  if (route.startPlaceId && !placeIds.has(route.startPlaceId)) {
    fail(`Ruta ${route.id}: startPlaceId inexistente`);
  }
  if (route.endPlaceId && !placeIds.has(route.endPlaceId)) {
    fail(`Ruta ${route.id}: endPlaceId inexistente`);
  }
  for (const [lon, lat] of route.geometry.coordinates) {
    if (
      lon < ENTORNO_PLACE_BOUNDS.minLon ||
      lon > ENTORNO_PLACE_BOUNDS.maxLon ||
      lat < ENTORNO_PLACE_BOUNDS.minLat ||
      lat > ENTORNO_PLACE_BOUNDS.maxLat
    ) {
      fail(`Ruta ${route.id}: geometría fuera de límites`);
    }
  }
}

// Colisión de slugs entre colecciones con páginas
for (const slug of routeSlugs) {
  if (placeSlugs.has(slug)) fail(`Colisión de slug lugar/ruta: ${slug}`);
}

const eventsPath = join(root, 'src/data/events.json');
let events = [];
if (existsSync(eventsPath)) {
  const eventResult = validateEventList(load(eventsPath));
  if (!eventResult.ok) {
    console.error('Eventos inválidos:');
    for (const e of eventResult.errors) console.error(`- ${e}`);
    process.exit(1);
  }
  events = eventResult.events;
  const eventSlugs = new Set();
  for (const event of events) {
    if (eventSlugs.has(event.slug)) fail(`slug de evento duplicado ${event.slug}`);
    eventSlugs.add(event.slug);
    if (placeSlugs.has(event.slug) || routeSlugs.has(event.slug)) {
      fail(`Colisión de slug evento con otra colección: ${event.slug}`);
    }
  }
  const now = Date.now();
  const upcoming = events.filter(
    (e) => e.status === 'published' && Date.parse(e.expiresAt) >= now,
  );
  console.log(`OK: ${places.length} lugares + ${services.length} servicios + ${routes.length} rutas + ${events.length} eventos (${upcoming.length} próximos)`);
} else {
  console.log(`OK: ${places.length} lugares + ${services.length} servicios + ${routes.length} rutas (sin events.json)`);
}

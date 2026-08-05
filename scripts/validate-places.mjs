#!/usr/bin/env node
/**
 * Valida lugares y servicios.
 * Uso: node scripts/validate-places.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const RETIRO_PLACE_BOUNDS = {
  minLon: -3.692,
  minLat: 40.408,
  maxLon: -3.675,
  maxLat: 40.424,
};

const coords = z.tuple([z.number(), z.number()]).refine(
  ([lon, lat]) =>
    lon >= RETIRO_PLACE_BOUNDS.minLon &&
    lon <= RETIRO_PLACE_BOUNDS.maxLon &&
    lat >= RETIRO_PLACE_BOUNDS.minLat &&
    lat <= RETIRO_PLACE_BOUNDS.maxLat,
  { message: 'coordenadas fuera de los límites del Retiro' },
);

const placeSchema = z.object({
  id: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug debe ser kebab-case'),
  name: z.string().min(1),
  category: z.enum([
    'iconico',
    'monumento',
    'cultura',
    'naturaleza',
    'familias',
    'paseo',
    'servicio',
    'acceso',
  ]),
  coordinates: coords,
  shortDescription: z.string().min(10).max(220),
  description: z.string().min(20).max(900),
  tags: z.array(z.string().min(1)).min(1),
  sourceName: z.string().min(1),
  sourceUrl: z.url(),
  lastVerifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['verified', 'needs-review']),
  accessibility: z.array(z.string()).optional(),
  openingHoursNote: z.string().optional(),
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
  coordinates: coords,
  shortDescription: z.string().min(10).max(280),
  sourceName: z.string().min(1),
  sourceUrl: z.url(),
  lastVerifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['verified', 'needs-review']),
  accessibility: z.array(z.string()).optional(),
  availabilityNote: z.string().optional(),
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

function validate(label, path, schema, minCount) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const result = schema.array().safeParse(raw);
  if (!result.success) {
    console.error(`Validación de ${label} fallida:\n`);
    for (const issue of result.error.issues) {
      const p = issue.path.length ? issue.path.join('.') : '(raíz)';
      console.error(`- ${p}: ${issue.message}`);
    }
    process.exit(1);
  }
  if (result.data.length < minCount) {
    console.error(`Se esperaban al menos ${minCount} ${label}, hay ${result.data.length}.`);
    process.exit(1);
  }
  return result.data;
}

const placesPath = join(root, 'src/data/places.json');
const servicesPath = join(root, 'src/data/services.json');

const places = validate('lugares', placesPath, placeSchema, 20);
const services = validate('servicios', servicesPath, serviceSchema, 15);

if (!uniqueBy('id', places, 'lugares') || !uniqueBy('slug', places, 'lugares')) {
  process.exit(1);
}
if (!uniqueBy('id', services, 'servicios')) {
  process.exit(1);
}

if (places.length !== 20) {
  console.error(`Se esperaban exactamente 20 lugares, hay ${places.length}.`);
  process.exit(1);
}

console.log(
  `OK: ${places.length} lugares y ${services.length} servicios validados`,
);

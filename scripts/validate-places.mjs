#!/usr/bin/env node
/**
 * Valida src/data/places.json contra el esquema Place.
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

const placeCategorySchema = z.enum([
  'iconico',
  'monumento',
  'cultura',
  'naturaleza',
  'familias',
  'paseo',
  'servicio',
  'acceso',
]);

const placeSchema = z.object({
  id: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug debe ser kebab-case'),
  name: z.string().min(1),
  category: placeCategorySchema,
  coordinates: z
    .tuple([z.number(), z.number()])
    .refine(
      ([lon, lat]) =>
        lon >= RETIRO_PLACE_BOUNDS.minLon &&
        lon <= RETIRO_PLACE_BOUNDS.maxLon &&
        lat >= RETIRO_PLACE_BOUNDS.minLat &&
        lat <= RETIRO_PLACE_BOUNDS.maxLat,
      { message: 'coordenadas fuera de los límites del Retiro' },
    ),
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

const placesArraySchema = z.array(placeSchema).superRefine((places, ctx) => {
  const ids = new Set();
  const slugs = new Set();
  places.forEach((place, index) => {
    if (ids.has(place.id)) {
      ctx.addIssue({ code: 'custom', message: `id duplicado: ${place.id}`, path: [index, 'id'] });
    }
    ids.add(place.id);
    if (slugs.has(place.slug)) {
      ctx.addIssue({
        code: 'custom',
        message: `slug duplicado: ${place.slug}`,
        path: [index, 'slug'],
      });
    }
    slugs.add(place.slug);
  });
});

const dataPath = join(root, 'src/data/places.json');
const raw = JSON.parse(readFileSync(dataPath, 'utf8'));
const result = placesArraySchema.safeParse(raw);

if (!result.success) {
  console.error('Validación de lugares fallida:\n');
  for (const issue of result.error.issues) {
    const path = issue.path.length ? issue.path.join('.') : '(raíz)';
    console.error(`- ${path}: ${issue.message}`);
  }
  process.exit(1);
}

if (result.data.length !== 20) {
  console.error(`Se esperaban 20 lugares, hay ${result.data.length}.`);
  process.exit(1);
}

console.log(`OK: ${result.data.length} lugares únicos validados (${dataPath})`);

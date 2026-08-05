import { z } from 'zod';
import { RETIRO_PLACE_BOUNDS, ENTORNO_PLACE_BOUNDS } from '../config/map';
import type { Place } from '../types/place';

export const placeCategorySchema = z.enum([
  'iconico',
  'monumento',
  'cultura',
  'naturaleza',
  'familias',
  'paseo',
  'servicio',
  'acceso',
]);

const audienceSchema = z.enum(['familias', 'turistas', 'locales', 'deportistas']);

function coordsInBounds(
  lon: number,
  lat: number,
  bounds: { minLon: number; minLat: number; maxLon: number; maxLat: number },
): boolean {
  return (
    lon >= bounds.minLon &&
    lon <= bounds.maxLon &&
    lat >= bounds.minLat &&
    lat <= bounds.maxLat
  );
}

export const placeSchema = z
  .object({
    id: z.string().min(1),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug debe ser kebab-case'),
    name: z.string().min(1),
    alternativeNames: z.array(z.string().min(1)).optional(),
    category: placeCategorySchema,
    coordinates: z.tuple([z.number(), z.number()]),
    shortDescription: z.string().min(10).max(220),
    description: z.string().min(20).max(900),
    tags: z.array(z.string().min(1)).min(1),
    audience: z.array(audienceSchema).optional(),
    recommendedDurationMinutes: z.number().int().positive().max(480).optional(),
    bestFor: z.array(z.string().min(1)).optional(),
    area: z.enum(['retiro', 'entorno']).optional(),
    sourceName: z.string().min(1),
    sourceUrl: z.url(),
    sourceTier: z.enum(['A', 'B', 'C', 'D']).optional(),
    lastVerifiedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'lastVerifiedAt debe ser YYYY-MM-DD'),
    status: z.enum(['verified', 'needs-review']),
    accessibility: z.array(z.string()).optional(),
    openingHoursNote: z.string().optional(),
  })
  .superRefine((place, ctx) => {
    const [lon, lat] = place.coordinates;
    const bounds = place.area === 'entorno' ? ENTORNO_PLACE_BOUNDS : RETIRO_PLACE_BOUNDS;
    if (!coordsInBounds(lon, lat, bounds)) {
      ctx.addIssue({
        code: 'custom',
        message: `coordenadas fuera de límites (${place.area ?? 'retiro'})`,
        path: ['coordinates'],
      });
    }
  });

export const placesArraySchema = z.array(placeSchema).superRefine((places, ctx) => {
  const ids = new Set<string>();
  const slugs = new Set<string>();

  places.forEach((place, index) => {
    if (ids.has(place.id)) {
      ctx.addIssue({
        code: 'custom',
        message: `id duplicado: ${place.id}`,
        path: [index, 'id'],
      });
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

export type ValidationResult =
  | { ok: true; places: Place[] }
  | { ok: false; errors: string[] };

export function validatePlaces(data: unknown): ValidationResult {
  const parsed = placesArraySchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => {
        const path = issue.path.length ? issue.path.join('.') : '(raíz)';
        return `${path}: ${issue.message}`;
      }),
    };
  }
  return { ok: true, places: parsed.data as Place[] };
}

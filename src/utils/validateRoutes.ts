import { z } from 'zod';
import { ENTORNO_PLACE_BOUNDS } from '../config/map';
import type { ParkRoute } from '../types/route';

const lineCoords = z
  .array(z.tuple([z.number(), z.number()]))
  .min(2)
  .superRefine((coords, ctx) => {
    coords.forEach(([lon, lat], index) => {
      if (
        lon < ENTORNO_PLACE_BOUNDS.minLon ||
        lon > ENTORNO_PLACE_BOUNDS.maxLon ||
        lat < ENTORNO_PLACE_BOUNDS.minLat ||
        lat > ENTORNO_PLACE_BOUNDS.maxLat
      ) {
        ctx.addIssue({
          code: 'custom',
          message: `vértice ${index} fuera de límites razonables del Retiro`,
          path: [index],
        });
      }
    });
  });

export const parkRouteSchema = z.object({
  id: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug debe ser kebab-case'),
  name: z.string().min(1),
  shortDescription: z.string().min(10).max(220),
  description: z.string().min(20).max(1200),
  audience: z.array(z.string().min(1)).min(1),
  estimatedDurationMinutes: z.number().int().positive().max(480),
  approximateDistanceMeters: z.number().int().positive().max(20000),
  difficulty: z.enum(['facil', 'moderada']),
  circular: z.boolean(),
  stopIds: z.array(z.string().min(1)).min(2),
  geometry: z.object({
    type: z.literal('LineString'),
    coordinates: lineCoords,
  }),
  startPlaceId: z.string().min(1).optional(),
  endPlaceId: z.string().min(1).optional(),
  accessibilityNote: z.string().optional(),
  sourceName: z.string().min(1),
  sourceUrl: z.url(),
  lastVerifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['verified', 'needs-review']),
});

export type RouteValidationResult =
  | { ok: true; routes: ParkRoute[] }
  | { ok: false; errors: string[] };

export function validateRoutes(
  data: unknown,
  placeIds: Set<string>,
): RouteValidationResult {
  const parsed = z.array(parkRouteSchema).safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => {
        const path = issue.path.length ? issue.path.join('.') : '(raíz)';
        return `${path}: ${issue.message}`;
      }),
    };
  }

  const errors: string[] = [];
  const ids = new Set<string>();
  const slugs = new Set<string>();

  parsed.data.forEach((route, index) => {
    if (ids.has(route.id)) errors.push(`${index}.id: id duplicado ${route.id}`);
    ids.add(route.id);
    if (slugs.has(route.slug)) errors.push(`${index}.slug: slug duplicado ${route.slug}`);
    slugs.add(route.slug);

    for (const stopId of route.stopIds) {
      if (!placeIds.has(stopId)) {
        errors.push(`${index}.stopIds: stopId inexistente: ${stopId}`);
      }
    }
    if (route.startPlaceId && !placeIds.has(route.startPlaceId)) {
      errors.push(`${index}.startPlaceId: no existe ${route.startPlaceId}`);
    }
    if (route.endPlaceId && !placeIds.has(route.endPlaceId)) {
      errors.push(`${index}.endPlaceId: no existe ${route.endPlaceId}`);
    }
  });

  if (parsed.data.length !== 5) {
    errors.push(`Se esperaban exactamente 5 rutas, hay ${parsed.data.length}`);
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, routes: parsed.data as ParkRoute[] };
}

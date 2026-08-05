import { z } from 'zod';
import { ENTORNO_PLACE_BOUNDS } from '../config/map';
import type { ParkEvent } from '../types/event';

export const eventStatusSchema = z.enum([
  'draft',
  'published',
  'cancelled',
  'postponed',
  'expired',
  'needs-review',
]);

export const parkEventSchema = z
  .object({
    id: z.string().min(1),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug debe ser kebab-case'),
    title: z.string().min(1),
    shortDescription: z.string().min(5).max(400),
    startAt: z.string().min(10),
    endAt: z.string().min(10).optional(),
    allDay: z.boolean().optional(),
    venue: z.string().min(1),
    coordinates: z.tuple([z.number(), z.number()]).optional(),
    category: z.string().min(1),
    audience: z.array(z.string()).optional(),
    priceNote: z.string().optional(),
    registrationUrl: z.string().url().optional(),
    sourceName: z.string().min(1),
    sourceUrl: z.string().url(),
    sourceTier: z.enum(['A', 'B', 'C', 'D']),
    sourceEventId: z.string().optional(),
    sourceUpdatedAt: z.string().optional(),
    lastCheckedAt: z.string().min(10),
    expiresAt: z.string().min(10),
    confidence: z.number().min(0).max(1),
    status: eventStatusSchema,
  })
  .superRefine((event, ctx) => {
    const start = Date.parse(event.startAt);
    const expires = Date.parse(event.expiresAt);
    if (Number.isNaN(start) || Number.isNaN(expires)) {
      ctx.addIssue({ code: 'custom', message: 'fechas ISO inválidas' });
      return;
    }
    if (expires < start) {
      ctx.addIssue({
        code: 'custom',
        message: 'expiresAt debe ser posterior o igual a startAt',
        path: ['expiresAt'],
      });
    }
    if (event.endAt) {
      const end = Date.parse(event.endAt);
      if (!Number.isNaN(end) && end < start) {
        ctx.addIssue({
          code: 'custom',
          message: 'endAt anterior a startAt',
          path: ['endAt'],
        });
      }
    }
    if (event.coordinates) {
      const [lon, lat] = event.coordinates;
      if (
        lon < ENTORNO_PLACE_BOUNDS.minLon ||
        lon > ENTORNO_PLACE_BOUNDS.maxLon ||
        lat < ENTORNO_PLACE_BOUNDS.minLat ||
        lat > ENTORNO_PLACE_BOUNDS.maxLat
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'coordenadas fuera del ámbito ampliado del Retiro',
          path: ['coordinates'],
        });
      }
    }
  });

export type EventValidationResult =
  | { ok: true; events: ParkEvent[] }
  | { ok: false; errors: string[] };

export function validateEvents(data: unknown): EventValidationResult {
  const parsed = z.array(parkEventSchema).safeParse(data);
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
  parsed.data.forEach((event, index) => {
    if (ids.has(event.id)) errors.push(`${index}.id: duplicado ${event.id}`);
    ids.add(event.id);
    if (slugs.has(event.slug)) errors.push(`${index}.slug: duplicado ${event.slug}`);
    slugs.add(event.slug);
  });

  if (errors.length) return { ok: false, errors };
  return { ok: true, events: parsed.data as ParkEvent[] };
}

/** Eventos publicados futuros o en curso para la agenda principal. */
export function publishedUpcomingEvents(
  events: ParkEvent[],
  now = new Date(),
): ParkEvent[] {
  return events
    .filter((event) => event.status === 'published')
    .filter((event) => Date.parse(event.expiresAt) >= now.getTime())
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}

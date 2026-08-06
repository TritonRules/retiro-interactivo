/**
 * Validación Zod de eventos (espejo ligero del esquema TS).
 */
import { z } from 'zod';

const RETIRO = {
  minLon: -3.696,
  minLat: 40.405,
  maxLon: -3.672,
  maxLat: 40.427,
};

export const eventSchema = z
  .object({
    id: z.string().min(1),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
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
    registrationUrl: z.url().optional(),
    sourceName: z.string().min(1),
    sourceUrl: z.url(),
    sourceTier: z.enum(['A', 'B', 'C', 'D']),
    sourceEventId: z.string().optional(),
    sourceUpdatedAt: z.string().optional(),
    lastCheckedAt: z.string().min(10),
    expiresAt: z.string().min(10),
    confidence: z.number().min(0).max(1),
    status: z.enum([
      'draft',
      'published',
      'cancelled',
      'postponed',
      'expired',
      'needs-review',
    ]),
  })
  .superRefine((event, ctx) => {
    const start = Date.parse(event.startAt);
    const expires = Date.parse(event.expiresAt);
    if (Number.isNaN(start)) {
      ctx.addIssue({ code: 'custom', message: 'startAt inválido', path: ['startAt'] });
    }
    if (Number.isNaN(expires)) {
      ctx.addIssue({ code: 'custom', message: 'expiresAt inválido', path: ['expiresAt'] });
    }
    if (!Number.isNaN(start) && !Number.isNaN(expires) && expires < start) {
      ctx.addIssue({
        code: 'custom',
        message: 'expiresAt < startAt',
        path: ['expiresAt'],
      });
    }
    if (event.coordinates) {
      const [lon, lat] = event.coordinates;
      if (
        lon < RETIRO.minLon ||
        lon > RETIRO.maxLon ||
        lat < RETIRO.minLat ||
        lat > RETIRO.maxLat
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'coordenadas fuera de ámbito',
          path: ['coordinates'],
        });
      }
    }
  });

export function validateEventList(events) {
  const result = z.array(eventSchema).safeParse(events);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => {
        const path = issue.path.length ? issue.path.join('.') : '(raíz)';
        return `${path}: ${issue.message}`;
      }),
    };
  }
  const ids = new Set();
  const slugs = new Set();
  const errors = [];
  for (const [i, event] of result.data.entries()) {
    if (ids.has(event.id)) errors.push(`${i}.id duplicado`);
    if (slugs.has(event.slug)) errors.push(`${i}.slug duplicado`);
    ids.add(event.id);
    slugs.add(event.slug);
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, events: result.data };
}

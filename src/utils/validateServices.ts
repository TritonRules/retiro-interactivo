import { z } from 'zod';
import { RETIRO_PLACE_BOUNDS } from '../config/map';
import type { ParkService } from '../types/service';

export const serviceTypeSchema = z.enum([
  'aseo',
  'fuente',
  'zona-infantil',
  'acceso',
  'informacion',
  'restauracion',
  'deporte',
  'otros',
]);

export const parkServiceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: serviceTypeSchema,
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
  shortDescription: z.string().min(10).max(280),
  sourceName: z.string().min(1),
  sourceUrl: z.url(),
  lastVerifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['verified', 'needs-review']),
  accessibility: z.array(z.string()).optional(),
  availabilityNote: z.string().optional(),
});

export const servicesArraySchema = z.array(parkServiceSchema).superRefine((services, ctx) => {
  const ids = new Set<string>();
  services.forEach((service, index) => {
    if (ids.has(service.id)) {
      ctx.addIssue({
        code: 'custom',
        message: `id duplicado: ${service.id}`,
        path: [index, 'id'],
      });
    }
    ids.add(service.id);
  });
});

export type ServiceValidationResult =
  | { ok: true; services: ParkService[] }
  | { ok: false; errors: string[] };

export function validateServices(data: unknown): ServiceValidationResult {
  const parsed = servicesArraySchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => {
        const path = issue.path.length ? issue.path.join('.') : '(raíz)';
        return `${path}: ${issue.message}`;
      }),
    };
  }
  return { ok: true, services: parsed.data as ParkService[] };
}

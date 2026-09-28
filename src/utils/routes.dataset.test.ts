import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateRoutes } from './validateRoutes';

describe('routes.json', () => {
  it('valida exactamente 6 rutas con stopIds existentes', () => {
    const places = JSON.parse(
      readFileSync(join(process.cwd(), 'src/data/places.json'), 'utf8'),
    ) as Array<{ id: string }>;
    const routes = JSON.parse(
      readFileSync(join(process.cwd(), 'src/data/routes.json'), 'utf8'),
    );
    const result = validateRoutes(routes, new Set(places.map((p) => p.id)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.routes).toHaveLength(6);
      for (const route of result.routes) {
        expect(route.approximateDistanceMeters).toBeGreaterThan(400);
        expect(route.geometry.coordinates.length).toBeGreaterThan(1);
      }
    }
  });
});

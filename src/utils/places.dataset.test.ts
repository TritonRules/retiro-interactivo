import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validatePlaces } from './validatePlaces';

describe('places.json', () => {
  it('valida lugares únicos dentro del rango de fichas 2B', () => {
    const raw = JSON.parse(
      readFileSync(join(process.cwd(), 'src/data/places.json'), 'utf8'),
    );
    const result = validatePlaces(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.places.length).toBeGreaterThanOrEqual(30);
      expect(result.places.length).toBeLessThanOrEqual(80);
      const ids = new Set(result.places.map((p) => p.id));
      const slugs = new Set(result.places.map((p) => p.slug));
      expect(ids.size).toBe(result.places.length);
      expect(slugs.size).toBe(result.places.length);
    }
  });
});

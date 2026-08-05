import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validatePlaces } from './validatePlaces';

describe('places.json', () => {
  it('valida exactamente 20 lugares únicos', () => {
    const raw = JSON.parse(
      readFileSync(join(process.cwd(), 'src/data/places.json'), 'utf8'),
    );
    const result = validatePlaces(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.places).toHaveLength(20);
      const ids = new Set(result.places.map((p) => p.id));
      const slugs = new Set(result.places.map((p) => p.slug));
      expect(ids.size).toBe(20);
      expect(slugs.size).toBe(20);
    }
  });
});

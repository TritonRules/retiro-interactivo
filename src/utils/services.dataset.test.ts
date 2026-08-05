import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateServices } from './validateServices';

describe('services.json', () => {
  it('valida al menos 15 servicios únicos', () => {
    const raw = JSON.parse(
      readFileSync(join(process.cwd(), 'src/data/services.json'), 'utf8'),
    );
    const result = validateServices(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.services.length).toBeGreaterThanOrEqual(15);
      const ids = new Set(result.services.map((s) => s.id));
      expect(ids.size).toBe(result.services.length);
    }
  });
});

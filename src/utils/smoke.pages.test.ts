import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('smoke source pages', () => {
  it('incluye la portada del mapa', () => {
    const indexPath = join(process.cwd(), 'src/pages/index.astro');
    expect(existsSync(indexPath)).toBe(true);
    const content = readFileSync(indexPath, 'utf8');
    expect(content).toContain('MapExplorer');
    expect(content).toContain('mapa');
  });

  it('incluye página acerca-de y ruta dinámica de lugares', () => {
    expect(existsSync(join(process.cwd(), 'src/pages/acerca-de.astro'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'src/pages/lugares/[slug].astro'))).toBe(true);
  });
});

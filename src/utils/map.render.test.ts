import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (relative: string) => readFileSync(join(process.cwd(), relative), 'utf8');

describe('render del mapa', () => {
  it('pasa a MapLibre la URL del worker empaquetada por Vite', () => {
    const helper = read('src/utils/maplibre.ts');
    expect(helper).toContain('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url');
    expect(helper).toContain('setWorkerUrl');
  });

  it('carga MapLibre solo a través del helper', () => {
    for (const file of ['src/components/map/MapExplorer.tsx', 'src/components/map/PlaceMiniMap.tsx']) {
      const content = read(file);
      expect(content).toContain('loadMaplibre');
      expect(content).not.toContain("await import('maplibre-gl')");
    }
  });

  it('espera al estilo antes de añadir capas de rutas, eventos y ubicación', () => {
    const content = read('src/components/map/MapExplorer.tsx');
    const guards = content.match(/whenStyleReady\(/g) ?? [];
    // definición + rutas + eventos + ubicación
    expect(guards.length).toBeGreaterThanOrEqual(4);
  });

  it('mantiene el contenedor del mapa dimensionado frente al CSS de MapLibre', () => {
    expect(read('src/styles/map.css')).toContain('.mapa-canvas.maplibregl-map');
  });

  it('usa la shell del mapa como navigateFallback del service worker', () => {
    const config = read('astro.config.mjs');
    expect(config).toContain('navigateFallback: basePath');
    expect(config).not.toContain('navigateFallback: `${basePath}offline/`');
  });
});

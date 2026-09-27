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

  it('espera al estilo antes de añadir capas de rutas y ubicación', () => {
    const content = read('src/components/map/MapExplorer.tsx');
    const guards = content.match(/whenStyleReady\(/g) ?? [];
    // definición + rutas + ubicación (los eventos son marcadores DOM, no una capa)
    expect(guards.length).toBeGreaterThanOrEqual(3);
  });

  it('mantiene el contenedor del mapa dimensionado frente al CSS de MapLibre', () => {
    expect(read('src/styles/map.css')).toContain('.mapa-canvas.maplibregl-map');
  });

  it('sube el estado de ubicación por encima de la atribución en pantallas estrechas', () => {
    const css = read('src/styles/map.css');
    const regla = css.match(/\.geo-status\s*\{[^}]*\}/)?.[0] ?? '';
    expect(regla).toContain('bottom: calc(var(--space-3) + var(--geo-status-attrib-band))');

    const bandas = [...css.matchAll(/@media \(max-width: (\d+)px\)\s*\{\s*\.geo-status\s*\{\s*--geo-status-attrib-band: ([\d.]+)rem;/g)].map(
      ([, ancho, banda]) => ({ ancho: Number(ancho), banda: Number(banda) }),
    );
    // Una banda por cada salto de línea de la atribución: 819, 699 y 389 px.
    expect(bandas.map((b) => b.ancho)).toEqual([819, 699, 389]);
    // Cuanto más estrecha la pantalla, más líneas ocupa la atribución.
    expect(bandas.map((b) => b.banda)).toEqual([...bandas.map((b) => b.banda)].sort((a, b) => a - b));
    // Alturas medidas de la barra de atribución: 24, 44 y 64 px.
    for (const [indice, minimo] of [24, 44, 64].entries()) {
      expect(bandas[indice].banda * 16).toBeGreaterThanOrEqual(minimo);
    }
  });

  it('no oculta ni encoge la atribución cartográfica', () => {
    for (const hoja of ['src/styles/map.css', 'src/styles/global.css']) {
      const css = read(hoja);
      expect(css).not.toMatch(/maplibregl-ctrl-attrib[^{]*\{[^}]*display:\s*none/);
      expect(css).not.toMatch(/maplibregl-ctrl-attrib[^{]*\{[^}]*visibility:\s*hidden/);
      expect(css).not.toMatch(/maplibregl-ctrl-attrib[^{]*\{[^}]*font-size/);
    }
  });

  it('usa la shell del mapa como navigateFallback del service worker', () => {
    const config = read('astro.config.mjs');
    expect(config).toContain('navigateFallback: basePath');
    expect(config).not.toContain('navigateFallback: `${basePath}offline/`');
  });
});

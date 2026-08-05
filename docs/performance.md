# Rendimiento del mapa — Fase 2A

## Antes (Fase 1 / baseline 2026-08-05)

| Artefacto | Tamaño |
| --- | --- |
| Chunk con MapLibre (nombrado `markerFactory.*.js`) | ~916 KB |
| `MapExplorer.*.js` | ~6 KB |
| `client.*.js` (React) | ~180 KB |
| Total `dist/_astro` | ~1.2 MB |

MapLibre se importaba de forma estática desde `MapExplorer` y `PlaceMiniMap`.

## Después (Fase 2A)

| Artefacto | Tamaño |
| --- | --- |
| `maplibre-gl.*.js` (async) | ~947 KB |
| `MapExplorer.*.js` | ~15 KB |
| `markerFactory.*.js` | ~2 KB |
| `PlaceMiniMap.*.js` | ~1.4 KB |
| `client.*.js` | ~180 KB |

## Decisiones

- `import('maplibre-gl')` + CSS solo al montar el mapa.
- Tipos de MapLibre importados con `import type` (no entran en el bundle).
- GeoJSON de lugares/servicios también en `public/data/` para consumo externo / caché PWA.
- No se eliminó el aviso Vite >500 KB: el propio MapLibre supera ese umbral; el objetivo era **aislamiento**, no milagros de tamaño.
- No se sustituyen MapLibre ni OpenFreeMap.
- Teselas: `NetworkOnly` en el service worker (sin precaché masiva).

## Tiempo hasta mapa interactivo

Medición local aproximada (preview, red local, caché fría de teselas aparte):

- Shell HTML + CSS visible: inmediato tras primer paint.
- Island React + descarga chunk MapLibre: depende de red; en local <1 s tras hidratar.
- Mapa `load` + estilo OpenFreeMap: variable (red a `tiles.openfreemap.org`).

No se midió Lighthouse CI en esta fase; se recomienda en Fase 2B / beta.

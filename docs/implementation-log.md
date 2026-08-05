# Registro de implementación

## 2026-08-05 — Inicio Fase 2A

- Checkpoint Fase 1 reproducible: `validate:data`, `check`, `build` OK en rama `feature/fase-2a-pwa-geolocation`.
- Baseline de chunks (antes): `markerFactory*.js` ~916 KB (MapLibre absorbido), `MapExplorer` ~6 KB, total `_astro` ~1.2 MB.
- Alcance 2A: geolocalización voluntaria, servicios OSM, PWA, revisión POI, rendimiento mapa, QA responsive.

## 2026-08-05 — Cierre técnico Fase 2A

- Geolocalización: botón «Mi ubicación» (`◎`), solo tras gesto; sin `watchPosition`; sin persistencia ni envío de coordenadas.
- 25 servicios en `src/data/services.json` (aseos, agua potable, zonas infantiles, accesos, info, deporte).
- PWA con `@vite-pwa/astro` + `vite-plugin-pwa` (`--legacy-peer-deps` por peer Astro ≤5 vs Astro 7 del proyecto).
- MapLibre vía `import()` dinámico → chunk `maplibre-gl.*.js` (~947 KB) separado de `MapExplorer` (~15 KB).
- Documentación: `poi-review.md`, `performance.md`, `qa-phase-2a.md`, `pwa-testing.md`.

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

## 2026-08-05 — Inicio / avance Fase 2B

- Rama `feature/fase-2b-content-routes-events` desde cierre 2A (`46eaadc`).
- Contenido: 36 lugares + 44 servicios = **80 fichas** (rango 60–100).
- Cinco rutas temáticas con GeoJSON LineString, páginas `/rutas/` y `?ruta=`.
- Agenda `/agenda/` + pipeline Madrid Open Data (tier A), filtrado geográfico, dedupe, publicación atómica.
- `source-registry.yml` con agendas municipales verificadas (CC BY 4.0).
- Nav compacta: Mapa / Rutas / Agenda / Acerca.
- Docs 2B: content-model, routes, event-pipeline, event-editorial-policy, qa-phase-2b, beta-readiness.
- Precache PWA: se excluyen fichas individuales `/agenda/*/`.

## 2026-09-06 — Iteración 1: agenda e información fiables

- Rama `codex/iteracion-1-agenda-fiable` desde `3d19d6a`. Candidato local; sin push.
- Contrato Madrid único (`docs/iteracion-1/contrato-temporal.md`): IANA, recurrencias, caducidad, frescura 48 h / 7 d.
- Pipeline: `lastCheckedAt` solo de fetch real; publicación transaccional; recolección 2026-09-06 → 74 eventos.
- Agenda en cliente: filtros, URL, Hoy/próximos/stale, reloj compartido. Mapa y ficha con las mismas reglas.
- Editorial: Palacio de Cristal cerrado al interior; CEA y La Cabaña separados; 38 lugares.
- E2E Playwright contra build estático (22 tests). CI de PR con `contents: read`.
- Vitest 103. Build 122 páginas. QA: `docs/iteracion-1/qa.md`.
- Clasificación: **Iteración 1 cerrada técnicamente**. Pendiente de campo = Iteración 3.

## 2026-08-06 — Fase 3 preparación beta privada

- Rama `feature/fase-3-private-beta` desde `6fcbce2`.
- Corrección deep-link `?ruta=`/`?lugar=`/`?evento=` (lectura en cliente; Astro estático).
- Coordenadas curatoriales de sedes (CIEA y otras) en el normalizador de eventos.
- Ajuste geometría ruta `retiro-con-ninos` (eliminar salto ~593 m).
- Zod 4: `z.url()` sustituye `z.string().url()` deprecado.
- PWA: `cleanupOutdatedCaches` + denylist ampliada.
- Docs: editorial eventos, validación rutas, QA matriz, legacy-peer-deps, checklist deploy.
- Veredicto: **beta técnica viable** (no lista del todo sin Safari/Firefox/geo real).

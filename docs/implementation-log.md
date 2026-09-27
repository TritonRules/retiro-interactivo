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

## 2026-09-27 — Iteración 1 publicada y revalidada en iPhone

- PR #1 fusionado en `beta` (merge `43c12ac`); deploy Pages run `36305621625` OK.
- Corrección previa al merge (`e7d768b`): el mapa degrada sin WebGL2 o si MapLibre no inicializa (aviso accesible; fichas, rutas y filtros siguen disponibles).
- **Revalidación física en iPhone real superada** (confirmada por el propietario el 2026-09-27). Cierra la revalidación pendiente de QA-PHYS-01/02/03.

## 2026-09-27 — Vídeos opcionales en lugares y rutas

- Rama `feat/videos-lugares-rutas`. Campo opcional `videos` en lugares y rutas, validado con Zod compartido (`src/utils/videos.shared.mjs`) en la app y en `validate:data`.
- Bloque «Vídeos» en ficha del mapa, página de lugar, tarjeta de ruta activa y página de ruta; no aparece si no hay vídeos.
- Embed ligero: miniatura de `i.ytimg.com` + botón; el iframe de `youtube-nocookie.com` solo se carga tras el clic. YouTube queda fuera del caché del SW (`NetworkOnly`).
- Sin vídeos reales todavía. Datos de prueba solo en `e2e/fixtures/videos.json` (build e2e).

## 2026-09-27 — Escenarios de vídeo y vídeo plegado en rutas

- Rama `feat/videos-escenarios` desde `a167fda`. Contexto: el canal publicará sobre todo paseos por las rutas, con versiones por condición (lluvia, otoño, viento, frío, nieve…).
- Campo opcional `scenario` en cada vídeo con vocabulario controlado (`VIDEO_SCENARIO_LABELS` en `src/utils/videos.shared.mjs`, fuente única para validador y UI). Regla: como mucho un vídeo por escenario + tipo.
- Etiquetas de tipo: `visita` → «Paseo», `ia` → «Animación IA».
- Tarjeta de ruta en el mapa: vídeo plegado por defecto tras «Ver vídeo(s) del recorrido». Selector de escenario accesible (`radiogroup`, teclado) cuando hay 2+ vídeos con escenario, también en páginas y fichas. Deep link `?escenario=`.
- Tests: 149 unitarios, E2E 29 (6 de vídeos). Sin vídeos reales.

## 2026-09-27 — Modo paseo guiado en rutas

- Rama `feat/modo-paseo` desde `beta` (`cb50e6b`). Botón «Empezar ruta» en la ficha de la ruta y en la tarjeta de ruta del mapa.
- `watchPosition` (alta precisión) solo con el paseo activo y la página visible; punto en vivo + círculo de precisión, seguimiento que se pausa al arrastrar y botón «Centrar».
- Panel compacto: siguiente parada, distancia, tiempo a ~4,5 km/h, «Parada N de M», anterior/saltar y «Terminar». Llegada con radio adaptado (25 m + desvío de la parada respecto al trazado + margen GPS), abre la ficha del lugar y avanza; «Ruta completada» al final.
- Errores de ubicación con `GEO_STATUS_LABEL`; modo demostración (simulación por el trazado) fuera del Retiro, con permiso denegado o sin HTTPS. Wake Lock opcional.
- Corrección: `whenStyleReady` podía quedarse esperando un `load` que ya no se emite cuando `isStyleLoaded()` era falso por teselas o fuentes en carga (el punto de ubicación no se movía).
- Detalles en `docs/routes.md` (sección «Modo paseo guiado»). Pendiente: prueba física con iPhone en el Retiro (`docs/qa-beta-devices.md`).
- Tests: 175 unitarios (18 del modo paseo, incl. simulación completa de las cinco rutas reales), E2E 36 (5 del modo paseo).

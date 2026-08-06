# Matriz QA — Fase 3 (beta privada)

Fecha: 2026-08-06. Entorno de prueba del agente: macOS + Chromium embebido Cursor + build estático `BASE=/retiro-interactivo`.

| ID | Dispositivo | Navegador | Prueba | Resultado | Evidencia | Defecto |
| --- | --- | --- | --- | --- | --- | --- |
| QA-01 | Mac (agente) | Chromium Cursor | Portada mapa, nav Mapa/Rutas/Agenda/Acerca | OK | Snapshot a11y post-unregister SW | — |
| QA-02 | Mac (agente) | Chromium Cursor | Contadores 80 fichas / 36 lugares visibles | OK | «Todos (80)», «36 puntos visibles» | — |
| QA-03 | Mac (agente) | Chromium Cursor | `/rutas/` cinco rutas listadas | OK | Snapshot listado | — |
| QA-04 | Mac (agente) | Chromium Cursor | `?ruta=retiro-imprescindible` activa ruta | OK tras fix cliente | Antes fallaba (Astro estático) | DEF-01 corregido |
| QA-05 | Mac (agente) | Chromium Cursor | SW antiguo muestra offline/Fase 2A | FALLO observado | Offline page + footer 2A hasta unregister | DEF-02 mitigado (`cleanupOutdatedCaches`) |
| QA-06 | — | Firefox | Suite QA-01…05 | No ejecutado | Firefox no instalado en el host | Pendiente beta |
| QA-07 | — | Safari/WebKit | Suite QA-01…05 | No ejecutado | Safari presente; no automatizado aquí | Pendiente beta |
| QA-08 | Lógico | — | Geo concedida | Código OK; no GPS real | `geolocation.ts` + botón ◎ | Pendiente dispositivo |
| QA-09 | Lógico | — | Geo denegada / fuera / no disponible | Estados definidos | `GEO_STATUS_LABEL` | Pendiente dispositivo |
| QA-10 | Build | Chromium | `sw.js` + manifest generados | OK | `dist/sw.js`, `dist/manifest.webmanifest` | — |
| QA-11 | Build | — | Offline page existe | OK | `/offline/` | — |
| QA-12 | Build | — | Precache no incluye fichas agenda masivas | OK | `globIgnores: agenda/*/` | — |
| QA-13 | CLI | — | Zod deprecations | OK | `astro check` 0 hints | DEF-03 corregido |
| QA-14 | CLI | — | Ruta niños sin saltos >250 m | OK | Script haversine | DEF-04 corregido |
| QA-15 | CLI | — | Coords CIEA curatoriales | OK | Test pipeline + events.json | DEF-05 corregido |

## Defectos

| ID | Severidad | Descripción | Estado |
| --- | --- | --- | --- |
| DEF-01 | Alta | Query `?ruta=`/`?lugar=`/`?evento=` no funcionaban en Pages estático | Corregido (lectura cliente) |
| DEF-02 | Media | SW de fase previa puede servir shell/offline obsoleto | Mitigado + doc beta |
| DEF-03 | Baja | `z.string().url()` deprecado en Zod 4 | Corregido → `z.url()` |
| DEF-04 | Media | Salto 593 m en ruta con niños | Corregido |
| DEF-05 | Alta | CIEA con coords municipales incorrectas | Corregido |

## Navegadores no cubiertos automáticamente

Instalar/probar manualmente antes de ampliar la beta: Firefox desktop, Safari iOS/macOS, Chrome Android.

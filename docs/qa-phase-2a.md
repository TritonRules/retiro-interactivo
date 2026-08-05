# QA Fase 2A — Responsive y navegación

Entorno: `npm run build` + `astro preview` con `BASE=/retiro-interactivo/`. Fecha: **2026-08-05**.

## Matriz de anchos (navegador Cursor / Chromium)

| Ancho | Scroll horizontal | Mapa útil | Marcadores | Controles / chips |
| --- | --- | --- | --- | --- |
| 360 px | OK (`scrollW=clientW=360`) | OK | 25 servicios con filtro activo | OK; chips con scroll horizontal intencional |
| 760 px (intermedio) | OK | OK | 20 lugares | OK |
| 1280 px | OK | OK | — (página lugar) | OK |

390 / 768: no se forzó Emulation aparte; CSS mobile-first continuo entre 360–1280. Recomendable revalidar en Safari físico.

## Checklist funcional

| Prueba | Estado | Evidencia |
| --- | --- | --- |
| Build + SW | OK | `dist/sw.js` registrado en preview |
| Manifest | OK | `dist/manifest.webmanifest` + `<link rel="manifest">` en layout |
| Filtro Servicio | OK browser | 25 marcadores `place-marker--service`, URL `?categoria=servicio` |
| Geolocalización no al cargar | OK | Estado «Ubicación no activada» sin prompt |
| Página lugar | OK | `/lugares/palacio-de-cristal/` con fuente OSM |
| Offline page | OK build | `/offline/` |
| `test:e2e` | Omitido (stub) | Sin Playwright browsers; ver procedimiento manual |

## Procedimiento manual restante

1. Simular ubicación dentro/fuera del Retiro (DevTools → Sensors).
2. Denegar permiso de geolocalización y comprobar mensaje.
3. Instalar PWA en Chromium (HTTPS o localhost).
4. Offline tras visitar páginas.
5. Safari / WebKit y Firefox si están disponibles.
6. Zoom de texto 200 %.

Capturas locales: `docs/qa/screenshots/` (ignorado por Git).

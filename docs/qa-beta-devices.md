# QA beta — dispositivos reales

Beta técnica no anunciada (acceso por enlace). Repositorio público; GitHub Pages no aporta control de acceso.

**URL:** https://tritonrules.github.io/retiro-interactivo/  
**Candidato publicado:** `87ddb1a` · rama estable `beta` · run Actions `31158271676`

## Decisión de datos pre-push

`npm run events:build` regeneró solo `lastCheckedAt` / timestamps de informe respecto a `40cec6b`.  
**Despliegue:** exactamente el contenido de `40cec6b` (drift local descartado; sin commit de datos nuevo).

## Matriz de pruebas

| fecha | dispositivo | sistema | navegador | versión | prueba | resultado | defecto | severidad | evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-08-06 | CI / local Chromium (Cursor) | macOS | Chromium embebido | — | Smoke local pre-push (mapa, rutas, deep links, agenda, offline) | OK tras limpiar SW | SW antiguo puede servir `/offline/` hasta unregister | media (conocida) | Fase 3 QA local |
| 2026-08-06 | — | — | — | — | Despliegue Actions → Pages | bloqueado | Actions/Pages *major outage*. Build CI OK en `31124228860` (validate/check/build/artifact). Deploy cancelado esperando runner Pages. URL HTTPS 404. | crítica (infra externa) | https://www.githubstatus.com · https://github.com/TritonRules/retiro-interactivo/actions/runs/31124228860 |
| 2026-08-07 | — | — | — | — | Despliegue Actions → Pages (`87ddb1a`) | OK | — | — | run `31158271676`: build 31 s + deploy 11 s, ambos success |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | HTTP de portada, `sw.js`, `manifest.webmanifest`, `/rutas/`, `/agenda/`, `/offline/`, ficha de lugar, JSON de datos | OK | — | — | 200 en todas; sin 404 de assets con BASE `/retiro-interactivo/` |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Smoke portada con caché limpia (SW desregistrado + caches borradas) | OK | — | — | 36 marcadores, basemap y atribución visibles, canvas 893 px, WebGL sin pérdida de contexto, 0 peticiones ≥400 |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Worker MapLibre 6 en producción | OK | — | — | `maplibre-gl-worker-fS9eBZUt.js` 200 (468 kB); glyphs y sprites de OpenFreeMap 200; sin `Failed to fetch dynamically imported module` |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Deep link directo `?ruta=ruta-fotografica` con caché limpia | OK | — | — | «7 puntos visibles · ruta activa», trazado y 7 paradas; no se sirve `/offline/` |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Deep link directo `?lugar=estanque-grande` con caché limpia | OK | — | — | Ficha «Estanque Grande del Retiro» abierta sobre el mapa |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Deep link directo `?evento=antonio-pedrero-50104191` con caché limpia | Parcial | La ficha del evento se monta (108 puntos, isla React intacta, sin `Style is not done loading`) pero no es visible: usa clases `place-sheet*` sin CSS y queda bajo el canvas | media | Preexistente desde `6fcbce2`; lugares/servicios usan las clases `ficha*`, que sí tienen estilos |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Slug de ruta inexistente (`?ruta=el-retiro-con-ninos`) | OK | — | — | Degrada al mapa completo sin error; slugs reales: `retiro-imprescindible`, `retiro-en-una-hora`, `retiro-con-ninos`, `ruta-fotografica`, `caminar-o-correr` |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | `/lugares/palacio-de-cristal/` con mini-mapa | OK | — | — | Canvas 413×218 con basemap y marcador |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Interacción: filtros de categoría, capa de eventos, capa de servicios, ficha de lugar, restablecer vista | OK | Avisos de MapLibre por iconos `gate` y `office` ausentes del sprite de OpenFreeMap | baja (cosmética, origen upstream) | 36 → 108 → 152 puntos; 0 errores de consola |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Segunda carga con service worker activo (portada, `?ruta=`, `?evento=`) | OK | — | — | Navegación servida desde `cache-storage`; worker MapLibre desde precaché; sin `/offline/` estando online |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Estado de cachés del SW | OK | — | — | Una sola caché `workbox-precache-v2-.../retiro-interactivo/` con 122 entradas; sin cachés obsoletas |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Shell offline (red emulada sin conexión) | OK | — | — | Portada, `/rutas/`, `/offline/` y ficha de lugar responden 200 desde precaché |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Actualización desde un service worker antiguo | pendiente | No reproducible: el SW previo del dominio se desregistró para el smoke limpio y un redespliegue del mismo commit no genera versión nueva | — | `registerType: 'prompt'` + `cleanupOutdatedCaches: true` verificados en `sw.js`; `registration.update()` no deja worker en `waiting` al no haber versión nueva |
| pendiente | iPhone | iOS | Safari | — | Apertura enlace, geo concedida/denegada, Añadir a inicio, icono, mapa/rutas/agenda | pendiente | — | — | — |
| pendiente | Android | Android | Chrome | — | Instalación PWA, geo dentro/fuera Retiro, SW update, offline shell | pendiente | — | — | — |
| pendiente | Escritorio | — | Chrome (perfil real) | — | Smoke HTTPS + instalación PWA | pendiente | — | — | — |
| pendiente | Escritorio | — | Firefox | — | Smoke HTTPS | pendiente | — | — | — |
| pendiente | Escritorio | — | Safari/WebKit | — | Smoke HTTPS | pendiente | — | — | — |
| pendiente | Campo | — | — | — | Validación física de rutas | pendiente | — | — | — |

## Criterio

**Clasificación actual (2026-08-07):** beta técnica publicada. Actions y Pages en verde, HTTPS 200, mapa, worker de MapLibre, rutas, eventos, deep links, manifest y service worker verificados en producción.

La incidencia del 2026-08-06 se resolvió sin tocar el proyecto: con GitHub operativo bastó relanzar el workflow sobre `beta`.

No declarar **beta de usuarios lista** hasta completar filas móviles/reales, geolocalización, instalación PWA, Firefox/Safari, validación física de rutas y canal de feedback.

## Defecto corregido, pendiente de desplegar

**Ficha de evento invisible en el mapa** (severidad media, preexistente desde `6fcbce2`). El `<aside>` que mostraba el evento seleccionado en `MapExplorer` usaba las clases `place-sheet`, `place-sheet__header` y `place-sheet__close`, que no existen en ninguna hoja de estilos: el elemento se quedaba en flujo estático dentro de `.mapa-canvas-wrap` y el canvas del mapa, absoluto e `inset: 0`, lo tapaba. Lugares y servicios sí se veían porque `PlaceSheet`/`ServiceSheet` usan la familia `ficha*`, estilada con `position: absolute` y `z-index: 4`. Quedaba enmascarado mientras el contenedor del mapa colapsaba a 0 px.

Corregido en `beta` con el componente `EventSheet`, que reutiliza el mismo overlay que las demás fichas. Verificado en preview local (`2026-08-07`): ficha visible en escritorio y móvil por deep link y por clic en el marcador, cierre correcto, sin regresiones en lugares, servicios ni `?ruta=`, 0 errores de consola. Pendiente de repetir el smoke en producción tras el próximo despliegue.

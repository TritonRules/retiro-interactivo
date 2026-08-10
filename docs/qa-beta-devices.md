# QA beta — dispositivos reales

Beta técnica no anunciada (acceso por enlace). Repositorio público; GitHub Pages no aporta control de acceso.

**URL:** https://tritonrules.github.io/retiro-interactivo/  
**Candidato publicado:** `1f5863a` · rama estable `beta` · run Actions `31369117942`  
**Publicaciones anteriores:** `3edc72e` (run `31264600283`) · `8eafc61` (run `31187581429`) · `cd9984c` (run `31182210507`) · `87ddb1a` (run `31158271676`)

**Utillaje de QA automatizado (temporal, fuera del repositorio):** Playwright con Chromium 151, Firefox 153 y WebKit 26.5 instalado en `/tmp/retiro-qa`, y axe-core 4.10 inyectado desde CDN. No se añadió ninguna dependencia a `package.json`.

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
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Deep link directo `?evento=antonio-pedrero-50104191` con caché limpia (`87ddb1a`) | Parcial | La ficha del evento se monta (108 puntos, isla React intacta, sin `Style is not done loading`) pero no es visible: usa clases `place-sheet*` sin CSS y queda bajo el canvas | media | Preexistente desde `6fcbce2`; corregido y verificado después en `cd9984c` |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Slug de ruta inexistente (`?ruta=el-retiro-con-ninos`) | OK | — | — | Degrada al mapa completo sin error; slugs reales: `retiro-imprescindible`, `retiro-en-una-hora`, `retiro-con-ninos`, `ruta-fotografica`, `caminar-o-correr` |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | `/lugares/palacio-de-cristal/` con mini-mapa | OK | — | — | Canvas 413×218 con basemap y marcador |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Interacción: filtros de categoría, capa de eventos, capa de servicios, ficha de lugar, restablecer vista | OK | Avisos de MapLibre por iconos `gate` y `office` ausentes del sprite de OpenFreeMap | baja (cosmética, origen upstream) | 36 → 108 → 152 puntos; 0 errores de consola |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Segunda carga con service worker activo (portada, `?ruta=`, `?evento=`) | OK | — | — | Navegación servida desde `cache-storage`; worker MapLibre desde precaché; sin `/offline/` estando online |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Estado de cachés del SW | OK | — | — | Una sola caché `workbox-precache-v2-.../retiro-interactivo/` con 122 entradas; sin cachés obsoletas |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Shell offline (red emulada sin conexión) | OK | — | — | Portada, `/rutas/`, `/offline/` y ficha de lugar responden 200 desde precaché |
| 2026-08-07 | — | — | — | — | Despliegue Actions → Pages (`cd9984c`) | OK | — | — | run `31182210507`: build y deploy success |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Ficha de evento sobre el mapa en producción (`?evento=antonio-pedrero-50104191`, `cd9984c`) | OK | — | — | El deep link selecciona el evento; ficha `ficha ficha--desktop` visible sobre el lienzo (`elementFromPoint` devuelve la propia ficha) con título «Antonio Pedrero», fecha, sede y acciones «Ver ficha» / «Cerrar»; isla React montada (108 puntos); 0 errores de consola y ningún error de MapLibre |
| 2026-08-07 | Escritorio (Cursor) | macOS 25.4 | Chromium embebido | — | Actualización desde un service worker antiguo (`87ddb1a` → `cd9984c`) | OK | — | — | La página arrancó controlada por el SW anterior sirviendo la shell antigua; el nuevo SW quedó en `waiting` y apareció el aviso «Hay una nueva versión disponible»; al pulsar «Actualizar» tomó el control y la página recargó con la shell nueva; desapareció el markup `place-sheet`, quedó una única caché de precaché, sin chunks obsoletos ni peticiones fallidas. Conforme a `registerType: 'prompt'` + `cleanupOutdatedCaches: true` |
| 2026-08-07 | Escritorio (QA automatizado) | macOS 25.4 | Chromium 151.0.7922.34 (Playwright) | 1440×900 | Smoke completo: portada, filtros, ficha de lugar, ficha de servicio, agenda, `/rutas/`, mini-mapa, deep links `?lugar=`/`?evento=`/`?ruta=` con recarga y back/forward | OK | — | — | 21/21 comprobaciones sobre `cd9984c`; 36 → 11 (Naturaleza) → 36 → 80 (servicios) → 152 (eventos) puntos; 0 errores de consola, 0 respuestas ≥400, 0 peticiones fallidas |
| 2026-08-07 | Escritorio (QA automatizado) | macOS 25.4 | Firefox 153.0 (Playwright) | 1440×900 | Mismo smoke + geolocalización simulada + SW/offline + PWA + responsive | OK | Recargando sin red, un `icon-192.png` interceptado por el SW deja un error de consola (QA-03) | baja (solo offline) | 21/21 comprobaciones; mapa, overlays, rutas y eventos equivalentes a Chromium |
| 2026-08-07 | Escritorio (QA automatizado) | macOS 25.4 | WebKit 26.5 (Playwright) | 1440×900 | Mismo smoke + geolocalización simulada + PWA + responsive | OK con limitación | La emulación offline de Playwright/WebKit aborta toda petición con «WebKit encountered an internal error»; no permite validar el modo sin red | — (limitación del arnés, no del producto) | 20/21 comprobaciones; precaché verificada aparte con `caches.match()`: 122 entradas y 200 en portada, `/rutas/`, `/agenda/`, `/offline/`, ficha de lugar y `places.json`. **Aproximación al motor de Safari, no Safari real** |
| 2026-08-07 | Móvil y tablet emulados (QA automatizado) | — | Chromium / Firefox / WebKit | 390×844, 430×932 y 820×1180 | Portada, filtros, ficha de lugar, ficha de evento, ruta activa, agenda, mini-mapa | OK | Solape del estado de ubicación con la atribución en anchos ≤767 px (QA-01) | media, ya resuelta en `8eafc61` | Sin overflow horizontal; fichas dentro del viewport; botón cerrar 44×44 px; mapa 635 px (390), 745 px (430) y 993 px (820) |
| 2026-08-07 | Escritorio (QA automatizado) | macOS 25.4 | Chromium / Firefox / WebKit | 1440×900 | Geolocalización **simulada** (no real): dentro del Retiro (40.4155, −3.6835), fuera (Barcelona) y permiso denegado | OK | — | — | Dentro: «Ubicación dentro del Retiro», marcador de usuario y 5 puntos cercanos entre 32 m y 133 m. Fuera: «Parece que estás fuera del Retiro» + «Volver al parque», sin lista de cercanos. Denegado: «Permiso de ubicación denegado» y mapa usable. Sin errores JS; sin persistencia en localStorage, sessionStorage ni cookies |
| 2026-08-07 | Escritorio (QA automatizado) | macOS 25.4 | Chromium 151 | 1440×900 | Deep links con el service worker ya instalado, hard reload (`Page.reload ignoreCache`) y deep link estando sin red | OK | — | — | `?lugar=`, `?evento=` y `?ruta=` servidos desde `cache-storage` con la shell del mapa, nunca `/offline/`; sin red, `?evento=` abre shell, ficha y 36 marcadores desde precaché (sin teselas) |
| 2026-08-07 | Escritorio (QA automatizado) | macOS 25.4 | Chromium 151 / Firefox 153 | 1440×900 | Offline → online | OK | — | — | Offline: portada, `/rutas/`, `/agenda/`, `/offline/`, ficha de lugar y `places.json` responden 200 desde precaché; al restaurar la red el mapa vuelve a pedir teselas sin borrar datos |
| 2026-08-07 | Escritorio (QA automatizado) | macOS 25.4 | Chromium / Firefox / WebKit | 1440×900 | PWA técnica | OK | Instalabilidad real no comprobable en modo automatizado | — | HTTPS, SW controlando, `name`/`short_name`, `start_url` y `scope` = `/retiro-interactivo/`, `display: standalone`, iconos 192, 512 y 512 maskable |
| 2026-08-07 | Escritorio (QA automatizado) | macOS 25.4 | Chromium 151 + axe-core 4.10 | 1440×900 | Accesibilidad básica: axe (WCAG 2.0/2.1 A y AA) en portada, agenda, `/rutas/`, ficha de lugar, `?evento=` y `?ruta=`, más recorrido de teclado | OK con salvedad | Contraste insuficiente en los chips «Monumento» (4,28:1) y «Familias» (3,25:1) sobre blanco (QA-02) | media, ya resuelta en `8eafc61` | Única violación detectada; 15–25 reglas superadas por página. Un solo `h1`, `lang=es-ES`, skip link, región del mapa etiquetada, 2 `role=status`, controles del mapa con nombre, foco visible en los 14 primeros tabulados, ficha con `role=dialog` + `aria-labelledby` y cierre operable con teclado |
| 2026-08-07 | Escritorio (QA automatizado) | macOS 25.4 | Chromium 151 | 1440×900 y 390×844 | Performance básica (orientativa, no contractual) | OK | — | — | TTFB 13–18 ms, DCL ~0,5 s, mapa con marcadores ~4,5 s en frío y ~0,3 s en caliente; 19 recursos y ~487 kB (MapLibre 245 kB + worker 127 kB + cliente 57 kB + MapExplorer 34 kB); teselas OpenFreeMap ≤30 ms |
| 2026-08-07 | — | — | — | — | Despliegue Actions → Pages (`8eafc61`, hardening de QA-01 y QA-02) | OK | — | — | run `31187581429`: build 35 s y deploy 10 s, ambos success |
| 2026-08-08 | Escritorio (QA automatizado) | macOS 25.4 | Chromium 151 | 320×844, 390×844, 430×932, 700×900, 820×1180, 1440×900 | QA-01 en producción: estado de ubicación frente a la atribución en portada, `?evento=` y `?ruta=` | OK | — | — | Sin solape en ningún ancho: a 390 px el aviso ocupa y 743–781 y la atribución arranca en y 783; a 320 px la atribución pasa a tres líneas y el aviso sube a y 723–761. Texto íntegro «OpenFreeMap © OpenMapTiles Data from OpenStreetMap \| © OpenStreetMap · MapLibre» y `elementFromPoint` devuelve siempre la atribución o sus enlaces. Sin solape con controles, ficha ni panel de ruta |
| 2026-08-08 | Escritorio (QA automatizado) | macOS 25.4 | Chromium 151 | 390×844 y 1440×900 | QA-01 en los cuatro estados del aviso de ubicación (no activada, dentro, fuera con «Volver al parque», denegado) | OK | — | — | Incluso el estado más alto (90 px, dos líneas más botón) termina en y 781 con la atribución en 783; 5 cercanos dentro del Retiro y ninguno fuera |
| 2026-08-08 | Escritorio (QA automatizado) | macOS 25.4 | Chromium 151 + axe-core 4.10 | 1440×900 y 390×844 | QA-02 en producción: axe en portada, `?evento=` y `?ruta=` + contraste medido en el DOM | OK | — | — | 0 violaciones (24–25 reglas superadas por página). Monumento `#B45523` 4,92:1 y Familias `#906909` 4,99:1 sobre blanco; el resto de chips entre 5,15:1 y 7,75:1. Bordes y marcadores mantienen `#C45C26` y `#B8860B` |
| 2026-08-08 | Escritorio (QA automatizado) | macOS 25.4 | Chromium 151 | 1440×900 | Smoke de regresión completo sobre `8eafc61` en producción | OK | — | — | 21/21 comprobaciones: portada, filtros, lugar, servicio, agenda (72 próximos), `/rutas/` (5), mini-mapa, deep links con recarga y back/forward, geolocalización simulada, service worker, offline, vuelta online, PWA y accesibilidad. 0 errores de consola, 0 respuestas ≥400 |
| 2026-08-08 | Escritorio (QA automatizado) | macOS 25.4 | Chromium 151 | 1440×900 | Service worker de la nueva versión | OK | — | — | Precaché única con 122 entradas y solo chunks nuevos (`MapExplorer.CrhQjDyJ.js`, `markerFactory.DGD_XG_p.css`); sin rastro de `xF7jfR8z` ni `BER6CIQB`; segunda carga desde `cache-storage`; `cleanupOutdatedCaches` y el mensaje `SKIP_WAITING` de `registerType: 'prompt'` presentes en `sw.js`; aviso de actualización montado y oculto por no haber versión pendiente. La transición desde un SW antiguo se validó en `87ddb1a` → `cd9984c` con la misma configuración |
| 2026-08-09 | iPhone 16 | iOS 26.4.2 | Safari | — | Primer QA físico: apertura por enlace, mapa, ficha de evento, agenda y rutas | Parcial | «Ver ficha» y varios eventos de la agenda devolvían al mapa (QA-PHYS-01 y QA-PHYS-02); la Ruta fotográfica no conectaba sus paradas y cortaba por zonas sin camino (QA-PHYS-03) | alta | Reportado por el equipo tras recorrer la beta en el parque |
| 2026-08-09 | Escritorio (QA automatizado) | macOS 25.4 | Chromium 151 y WebKit 26.5 | 390×844 | Verificación de QA-PHYS-01 y 02 en el preview del build de producción, con el service worker activo | OK | La emulación offline de WebKit sigue abortando toda petición (limitación del arnés) | — | Mapa → «Ver ficha», recarga, atrás/adelante, «Ver en el mapa», **los 69 eventos de la agenda**, deep links `?evento=`/`?lugar=`/`?ruta=`, páginas precacheadas y offline en Chromium. 0 errores de consola |
| 2026-08-09 | Escritorio (QA automatizado) | macOS 25.4 | Chromium 151 | 390×844, 430×932, 1440×900 | Smoke visual de las cinco rutas regeneradas | OK | — | — | Trazado visible y continuo, 6/6/6/7/6 paradas, canvas 360–565 px, sin overflow ni errores. La Ruta fotográfica ya recorre sus siete paradas y termina en La Rosaleda |
| 2026-08-10 | — | — | — | — | Despliegue Actions → Pages (`1f5863a`, correcciones QA físico) | OK | — | — | run `31369117942`: build 30 s y deploy 8 s, ambos success. Fast-forward `3edc72e..1f5863a` |
| 2026-08-10 | Escritorio (QA automatizado) | macOS 25.4 | Chromium 151 | 390×844 | QA-PHYS-01/02 en producción con SW nuevo: mapa → evento → «Ver ficha», agenda completa, offline de fichas | OK | — | — | SW con `navigateFallbackAllowlist`, `NetworkFirst` + caché `retiro-eventos` y fallback `/offline/`. Clic en capa de eventos abre ficha; «Ver ficha» muestra la página estática. **66/66** eventos de la agenda. Offline A (visitada) desde caché; offline B (nunca visitada) → `/offline/`, nunca la shell. 0 errores, 0 ≥400 |
| 2026-08-10 | Escritorio (QA automatizado) | macOS 25.4 | WebKit 26.5 | 390×844 | Misma verificación Safari-like de QA-PHYS-01/02 | OK | Offline no comprobable en el arnés WebKit | — | Mapa → «Ver ficha», reload/back/forward, clic en agenda y muestra amplia (15/66: primeros, intermedios y últimos). 0 errores |
| 2026-08-10 | Escritorio (QA automatizado) | macOS 25.4 | Chromium 151 | 390×844 y 1440×900 | QA-PHYS-03 en producción: cinco rutas + geometría publicada | OK | — | — | `data/routes.json` idéntico al commit; 0 cruces del Estanque Grande; paradas en orden hacia adelante; Ruta fotográfica 7 paradas, ~2,3 km, termina en La Rosaleda. Smoke visual desktop/móvil |
| 2026-08-10 | Escritorio (QA automatizado) | macOS 25.4 | Chromium 151 | 1440×900 | Smoke general postdeploy sobre `1f5863a` | OK | — | — | Portada, mapa, filtros, lugar, servicio, evento, Ver ficha, agenda, ruta, deep links, geo simulada, PWA, offline y vuelta online. 0 errores de consola, 0 404 de assets |
| pendiente | iPhone | iOS | Safari | — | Revalidación física tras el despliegue de `1f5863a` | pendiente | — | — | El código está validado automáticamente en producción; falta confirmar en el mismo iPhone 16 / Safari del hallazgo original |
| pendiente | Android | Android | Chrome | — | Instalación PWA, geo dentro/fuera Retiro, SW update, offline shell | pendiente | — | — | — |
| pendiente | Escritorio | — | Chrome (perfil real) | — | Smoke HTTPS + instalación PWA | pendiente | — | — | — |
| pendiente | Escritorio | — | Firefox app instalada | — | Smoke HTTPS con perfil real | pendiente | Firefox no está instalado en este Mac; el motor queda cubierto por Firefox 153 de Playwright | — | — |
| pendiente | Escritorio | macOS 25.4 | Safari 26.4 real | — | Smoke HTTPS en Safari de escritorio | pendiente | No automatizable: «Permitir automatización remota» está desactivado en Safari y `screencapture` carece de permiso de grabación de pantalla. WebKit de Playwright cubre el motor, no la app | — | — |
| pendiente | Campo | — | — | — | Validación física de rutas | pendiente | — | — | — |

## Criterio

**Clasificación actual (2026-08-10):** beta de usuarios — pendiente de revalidación iPhone.

El primer recorrido con iPhone real destapó tres defectos de severidad alta (QA-PHYS-01, QA-PHYS-02 y QA-PHYS-03). Están corregidos en `1f5863a`, desplegados en producción (run `31369117942`) y validados automáticamente con Chromium y WebKit. **No se declaran resueltos físicamente** hasta repetir las mismas pruebas en el iPhone 16 / Safari del hallazgo original.

El QA automatizado está completo y en verde sobre `8eafc61` en producción: Chromium 151, Firefox 153 y WebKit 26.5 (escritorio, tablet y móvil emulados), mapa, worker de MapLibre, filtros, fichas de lugar, servicio y evento, rutas, agenda, mini-mapa, deep links con recarga y back/forward, service worker, offline y vuelta online, PWA técnica, geolocalización simulada, accesibilidad básica con axe y performance orientativa. Sin defectos CRITICAL ni HIGH abiertos.

Faltan, de forma obligatoria antes de declarar **beta de usuarios lista**: iPhone real con Safari, Android real con Chrome, instalación PWA física en ambos, geolocalización con GPS real, Safari de escritorio real, validación física de las rutas dentro del Retiro y un canal de feedback.

La incidencia del 2026-08-06 se resolvió sin tocar el proyecto: con GitHub operativo bastó relanzar el workflow sobre `beta`.

## Observaciones conocidas

1. Los eventos de todo el día muestran `0:00` porque el mapa y la agenda formatean `startAt` y el dato que consume el mapa no expone `allDay`. Comportamiento preexistente y consistente; verificado de nuevo en producción («4 sept 2026, 0:00»). Pendiente de mejora, fuera del alcance de este hardening.
2. La agenda muestra 72 eventos próximos aunque el JSON contenga 73: uno ya ha finalizado. Esperado por el paso del tiempo.
3. Avisos de MapLibre por los iconos `gate` y `office`, ausentes del sprite de OpenFreeMap. Severidad baja, origen upstream, sin impacto funcional.
4. Con una ruta activa en móvil, el panel ocupa la mitad superior y el mapa queda en unos 360 px útiles: usable y sin overflow.
5. Marcadores contiguos pueden interceptar el clic de un vecino al zoom por defecto; se resuelve acercando el mapa.

## Defectos del QA multidispositivo

### QA-01 — Solape del aviso de ubicación con la atribución · RESUELTO en `8eafc61`

**Severidad:** media. **Detectado:** 2026-08-07 en el QA multidispositivo automatizado.

**Causa.** `.geo-status` estaba anclado con `bottom: var(--space-3)` en la esquina inferior izquierda de `.mapa-canvas-wrap`, donde MapLibre ancla también su atribución. Mientras el texto cabe a la derecha no hay conflicto, pero al estrecharse la ventana la barra `.maplibregl-ctrl-attrib` cruza todo el ancho del lienzo y crece en líneas: 24 px de alto por debajo de 820 px, 44 px por debajo de 700 px y 64 px en pantallas muy estrechas. El aviso, de 38 px y a 12 px del fondo, caía dentro de esa banda y tapaba la mitad izquierda del texto. El solape empezaba en 767 px, no solo en los ≤430 px observados al principio.

**Corrección.** El desplazamiento se calcula con `bottom: calc(var(--space-3) + var(--geo-status-attrib-band))` y la variable sube en tres tramos que corresponden a los saltos de línea reales de la atribución (1,5 rem por debajo de 820 px, 2,75 rem por debajo de 700 px y 4 rem por debajo de 390 px). En escritorio vale `0rem`, así que nada se mueve. No se tocó la atribución.

**Evidencia en producción (2026-08-08).** Sin solape en 320×844, 390×844, 430×932, 700×900, 820×1180 y 1440×900, en portada, `?evento=` y `?ruta=ruta-fotografica`, y en los cuatro estados del aviso. Atribución íntegra y con sus enlaces accesibles. Cubierto por un test de regresión en `src/utils/map.render.test.ts`.

### QA-02 — Contraste insuficiente en los chips de filtro · RESUELTO en `8eafc61`

**Severidad:** media. **Detectado:** 2026-08-07 por axe-core sobre la portada y `?evento=`.

| Chip | Antes | Después | Contraste |
| --- | --- | --- | --- |
| Monumento | `#C45C26` | texto `#B45523` | 4,28:1 → **4,92:1** |
| Familias | `#B8860B` | texto `#906909` | 3,25:1 → **4,99:1** |

`CATEGORY_META` conserva los colores de identidad para marcadores, bordes y formas; se añadió un `textColor` opcional que solo usa el texto del chip cuando el color base no llega a 4,5:1. Las otras siete categorías siguen con un único color porque ya cumplían (5,15:1 a 7,75:1). axe en producción: **0 violaciones** en portada 1440 y 390, `?evento=` 1440 y 390, y `?ruta=` 390. Cubierto por `src/utils/categories.contrast.test.ts`.

### QA-03 — Error de consola de Firefox al recargar sin red · ABIERTO, en observación

**Severidad:** baja. Al recargar la portada estando offline, Firefox 153 registra «Failed to load `icon-192.png`. A ServiceWorker intercepted the request and encountered an unexpected error». La página offline funciona igual y no se reproduce en Chromium. No se corrige en este hardening; conviene comprobar si reaparece en Android real.

## Defectos del primer QA físico (iPhone 16, iOS 26.4.2, Safari · 2026-08-09)

### QA-PHYS-01 — «Ver ficha» desde el mapa devolvía al mapa · RESUELTO / VALIDADO AUTOMÁTICAMENTE · iPhone PENDIENTE DE REVALIDACIÓN

**Severidad:** alta mientras el defecto estaba abierto. **Detectado:** 2026-08-09 en iPhone 16 / iOS 26.4.2 / Safari.

**Causa.** Service worker: `navigateFallback` sin allowlist usurpaba las fichas de evento (excluidas del precaché) y devolvía la shell del mapa. El enlace y la página estática eran correctos.

**Corrección:** `1f5863a` — `navigateFallbackAllowlist` + `NetworkFirst` para `/agenda/<slug>/` (caché `retiro-eventos`, fallback `/offline/`).

**Postdeploy (2026-08-10, producción `1f5863a`).** Chromium y WebKit 390×844 con el SW nuevo controlando: mapa → capa de eventos → ficha → «Ver ficha» abre la página estática; reload, back y forward correctos. **QA físico iPhone: PENDIENTE DE REVALIDACIÓN.**

### QA-PHYS-02 — Eventos de la agenda devolvían al mapa · RESUELTO / VALIDADO AUTOMÁTICAMENTE · iPhone PENDIENTE DE REVALIDACIÓN

**Severidad:** alta mientras el defecto estaba abierto. **Detectado:** mismo contexto iPhone 16 / Safari. **Causa compartida** con QA-PHYS-01.

Los eventos «que sí funcionaban» eran los abiertos antes de que el SW tomara el control; una vez instalado, fallaban todos los listados.

**Corrección:** la misma de QA-PHYS-01 en `1f5863a`, más regla de enlace única (`eventDetailPath`).

**Postdeploy (2026-08-10).** Chromium: **66/66** fichas de la agenda. WebKit: muestra de 15/66 (primeros, intermedios y últimos) + clic real. Offline: ficha visitada desde `retiro-eventos`; ficha nunca visitada → `/offline/`, nunca la shell. **QA físico iPhone: PENDIENTE DE REVALIDACIÓN.**

### QA-PHYS-03 — Trazados que no seguían caminos · RESUELTO / VALIDADO AUTOMÁTICAMENTE · iPhone PENDIENTE DE REVALIDACIÓN

**Severidad:** alta para beta de usuarios mientras el defecto estaba abierto. **Detectado:** 2026-08-09 en iPhone real (Ruta fotográfica).

**Causa.** Geometrías manuales: las cinco rutas cruzaban el Estanque Grande; la fotográfica no llegaba a La Rosaleda (terminaba a 593 m).

**Corrección:** `1f5863a` — geometrías regeneradas con `npm run routes:paths` sobre la red peatonal OSM, persistidas como GeoJSON estático (sin routing en ejecución).

**Postdeploy (2026-08-10).** `data/routes.json` de producción idéntico al commit; 0 cruces de agua; paradas en orden; fotográfica 7 paradas, ~2,3 km, termina en La Rosaleda. **QA físico iPhone / campo: PENDIENTE DE REVALIDACIÓN.**

## Defecto corregido y desplegado

**Ficha de evento invisible en el mapa** (severidad media, preexistente desde `6fcbce2`). El `<aside>` que mostraba el evento seleccionado en `MapExplorer` usaba las clases `place-sheet`, `place-sheet__header` y `place-sheet__close`, que no existen en ninguna hoja de estilos: el elemento se quedaba en flujo estático dentro de `.mapa-canvas-wrap` y el canvas del mapa, absoluto e `inset: 0`, lo tapaba. Lugares y servicios sí se veían porque `PlaceSheet`/`ServiceSheet` usan la familia `ficha*`, estilada con `position: absolute` y `z-index: 4`. Quedaba enmascarado mientras el contenedor del mapa colapsaba a 0 px.

Corregido en `cd9984c` con el componente `EventSheet`, que reutiliza el mismo overlay que las demás fichas. Verificado en preview local (`2026-08-07`): ficha visible en escritorio y móvil por deep link y por clic en el marcador, cierre correcto, sin regresiones en lugares, servicios ni `?ruta=`, 0 errores de consola. Verificado también en producción tras el run `31182210507`, incluida la transición desde el service worker anterior.

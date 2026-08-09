# Pruebas PWA — Fase 2A

## Qué incluye

- Manifest: `dist/manifest.webmanifest` con `start_url` y `scope` = `BASE`.
- Service worker: `dist/sw.js` + Workbox.
- Precaché: shell HTML/CSS/JS/iconos y datos JSON/GeoJSON listados.
- Offline fallback: `/offline/`, precacheada y accesible por URL directa.
- `navigateFallback`: la shell del mapa (`BASE`), **no** `/offline/`, y solo para la propia shell. Ver más abajo.
- Fichas de evento (`<base>agenda/<slug>/`): fuera del precaché y servidas con `NetworkFirst`.
- Teselas OpenFreeMap: **NetworkOnly** (no se cachean en masa).
- Aviso discreto de nueva versión (`registerType: 'prompt'`).

## Cómo probar (local)

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm run build
BASE=/retiro-interactivo SITE=http://localhost:4321 npm run preview
```

1. Abre `http://localhost:4321/retiro-interactivo/`.
2. DevTools → Application → Manifest (nombre, iconos, start_url).
3. Application → Service Workers (debe aparecer `sw.js`).
4. Visita un lugar, luego Network → Offline → navega: shell/offline o páginas cacheadas.
5. Chromium → Instalar aplicación (si el criterio de instalación se cumple en HTTPS/localhost).

### Con `BASE=/`

```bash
BASE=/ SITE=http://localhost:4321 npm run build
BASE=/ SITE=http://localhost:4321 npm run preview
```

Comprueba que `manifest.webmanifest` use `start_url: "/"` y `scope: "/"`.

## Por qué `navigateFallback` apunta a la shell y no a `/offline/`

Workbox resuelve con `navigateFallback` cualquier navegación que no esté en el precaché, y una URL con
query (`?ruta=`, `?lugar=`, `?evento=`) no coincide con `index.html` precacheado. Con el fallback en
`/offline/`, un deep link **estando online** y con el service worker activo devolvía la página «Sin
conexión» en lugar del mapa; comprobado en preview el 2026-08-06. Apuntando a `BASE` se sirve la shell
del mapa, que hidrata `MapExplorer` y aplica el parámetro. `/offline/` sigue precacheada y se muestra
igual cuando no hay red, porque sin conexión la shell tampoco puede cargar teselas.

## Por qué el fallback está acotado con `navigateFallbackAllowlist`

Ese fallback, sin acotar, suplanta a cualquier página que no esté en el precaché. Las fichas de evento
se excluyen a propósito (`globIgnores: ['**/agenda/*/index.html']`) porque la agenda se renueva cada
semana, así que con el service worker activo abrir una ficha cambiaba la URL y mostraba el mapa: es el
defecto QA-PHYS-01/02 detectado en iPhone real el 2026-08-09. Desde entonces
`navigateFallbackAllowlist` deja que solo la propia shell —con o sin query— se resuelva con la shell,
y las fichas de evento tienen ruta propia `NetworkFirst` (caché `retiro-eventos`) con
`precacheFallback` a `/offline/`. Los patrones viven en `src/utils/serviceWorkerRoutes.ts`, que
`astro.config.mjs` importa y los tests comprueban.

## Limitaciones offline

- Sin teselas no hay mapa visual completo.
- Solo páginas/assets ya visitados o precacheados.
- No hay modo offline avanzado del parque entero.

## Dependencia

`@vite-pwa/astro` declara peer Astro ≤5; el proyecto usa Astro 7. Instalado con `--legacy-peer-deps`. Si la integración se rompe en un upgrade, valorar SW manual o actualización oficial del paquete.

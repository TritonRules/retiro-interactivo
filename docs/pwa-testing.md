# Pruebas PWA — Fase 2A

## Qué incluye

- Manifest: `dist/manifest.webmanifest` con `start_url` y `scope` = `BASE`.
- Service worker: `dist/sw.js` + Workbox.
- Precaché: shell HTML/CSS/JS/iconos y datos JSON/GeoJSON listados.
- Offline fallback: `/offline/`.
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

## Limitaciones offline

- Sin teselas no hay mapa visual completo.
- Solo páginas/assets ya visitados o precacheados.
- No hay modo offline avanzado del parque entero.

## Dependencia

`@vite-pwa/astro` declara peer Astro ≤5; el proyecto usa Astro 7. Instalado con `--legacy-peer-deps`. Si la integración se rompe en un upgrade, valorar SW manual o actualización oficial del paquete.

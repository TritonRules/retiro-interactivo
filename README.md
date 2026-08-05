# Retiro Interactivo

Mapa digital **mobile first** del Parque del Retiro de Madrid. Experiencia visual de exploración (metáfora de mapa de parque temático), no una web turística convencional.

**Estado:** Fase 2A — PWA, geolocalización voluntaria, servicios y endurecimiento móvil.

## Stack técnico

- [Astro](https://astro.build/) + TypeScript (salida estática)
- React solo en islas interactivas (mapa / fichas)
- [MapLibre GL JS](https://maplibre.org/) (import dinámico)
- Teselas/estilo [OpenFreeMap Liberty](https://openfreemap.org/quick_start/)
- PWA: `@vite-pwa/astro` + Workbox
- Datos en JSON / GeoJSON dentro del repositorio
- Validación con Zod
- Despliegue previsto en GitHub Pages (`SITE` / `BASE`)

## Requisitos locales

- Node.js **≥ 22.12**
- npm

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
```

Si instalas dependencias y aparece conflicto de peer de Astro con `@vite-pwa/astro`:

```bash
npm install --legacy-peer-deps
```

## Instalación y ejecución

```bash
npm install --legacy-peer-deps
npm run dev
```

Base por defecto: `/retiro-interactivo/`. En raíz local:

```bash
BASE=/ SITE=http://localhost:4321 npm run dev
```

## Validación y build

```bash
npm run validate:data   # 20 lugares + ≥15 servicios
npm run check
npm run lint
npm run test
npm run build
npm run preview
npm run test:e2e        # documenta procedimiento manual si no hay Playwright
```

## Mi ubicación (privacidad)

- El permiso **solo** se pide al pulsar el control ◎ («Mi ubicación»).
- Se usa `navigator.geolocation.getCurrentPosition` en HTTPS/localhost.
- La posición **no** se guarda en `localStorage`, cookies, logs ni URLs.
- **No** se envía a servidores externos.
- Dentro del Retiro: marcador propio, círculo de precisión y lista «Lo más cercano» (distancias aproximadas, no rutas).
- Fuera del Retiro: mensaje claro y «Volver al parque»; sin recomendaciones falsas.
- Puedes quitar la ubicación con el control ✕.

## Cómo añadir un lugar

1. Edita `src/data/places.json` (`Place` en `src/types/place.ts`).
2. `id`/`slug` únicos; coordenadas en el Retiro; `sourceUrl` real.
3. Regenera `public/data/places.geojson` si aplica.
4. `npm run validate:data && npm run build`.

## Cómo añadir un servicio

1. Edita `src/data/services.json` (`ParkService` / `ServiceType`).
2. Distingue agua potable de fuentes ornamentales.
3. No inventes horarios ni operatividad; usa `needs-review` si duda.
4. Regenera `public/data/services.geojson`.
5. `npm run validate:data`.

## PWA y responsive

- Guía PWA: `docs/pwa-testing.md`
- QA responsive: `docs/qa-phase-2a.md`
- Rendimiento mapa: `docs/performance.md`

## Variables `SITE` y `BASE`

Usadas en `astro.config.mjs` y en GitHub Actions. Ejemplos:

- Pages: `SITE=https://usuario.github.io` `BASE=/retiro-interactivo`
- Local raíz: `SITE=http://localhost:4321` `BASE=/`

## Limitaciones conocidas

- Offline sin teselas = mapa incompleto.
- `@vite-pwa/astro` peer oficial ≤ Astro 5 (workaround legacy-peer-deps).
- Accesibilidad/horarios reales pendientes de verificación in situ.
- Sin rutas, agenda ni expansión a 100 fichas (Fase 2B).

## Fase 2B (pendiente)

- 60–100 fichas, cinco rutas, esquema de eventos, agente recolector de fuentes.

## Documentación

- `docs/master-product.md`
- `docs/implementation-log.md`
- `docs/data-sources.md`
- `docs/poi-review.md`
- `docs/performance.md`
- `docs/qa-phase-2a.md`
- `docs/pwa-testing.md`

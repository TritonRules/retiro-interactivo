# Retiro Interactivo

Mapa digital **mobile first** del Parque del Retiro de Madrid. Experiencia visual de exploración (metáfora de mapa de parque temático), no una web turística convencional.

**Estado:** Fase 2B — contenido ampliado, cinco rutas temáticas, agenda oficial y pipeline de eventos.

**GitHub (personal):** https://github.com/TritonRules

## Stack técnico

- [Astro](https://astro.build/) + TypeScript (salida estática)
- React solo en islas interactivas (mapa / fichas)
- [MapLibre GL JS](https://maplibre.org/) (import dinámico)
- Teselas/estilo [OpenFreeMap Liberty](https://openfreemap.org/quick_start/)
- PWA: `@vite-pwa/astro` + Workbox
- Datos en JSON / GeoJSON dentro del repositorio
- Validación con Zod
- Pipeline editorial de eventos (CLI local)
- Despliegue previsto en GitHub Pages (`SITE` / `BASE`)

## Requisitos locales

- Node.js **≥ 22.12**
- npm

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm install --legacy-peer-deps
```

## Comandos principales

```bash
npm run validate:data
npm run check
npm run lint
npm run test
npm run build
npm run routes:validate
npm run content:report
npm run events:collect
npm run events:normalize
npm run events:validate
npm run events:build
npm run events:report
```

Base por defecto: `/retiro-interactivo/`. Local en raíz: `BASE=/ SITE=http://localhost:4321 npm run dev`.

## Cómo añadir un lugar

1. Edita `src/data/places.json` (`Place` en `src/types/place.ts`).
2. `id`/`slug` únicos; coordenadas en Retiro o `area: "entorno"`; fuente y `lastVerifiedAt`.
3. No inventes horarios/precios; usa `needs-review` si hay duda.
4. Opcional: deja candidatos en `data/candidates/` (no se publican solos).
5. `npm run validate:data && npm run content:report && npm run build`.

## Cómo añadir o modificar una ruta

1. Edita `src/data/routes.json` (`ParkRoute` en `src/types/route.ts`).
2. `stopIds` deben existir en lugares; `geometry` LineString sobre caminos razonables.
3. Distancia/duración aproximadas; avisar que no hay navegación giro a giro.
4. `npm run routes:validate && npm run validate:data`.
5. Abrir en mapa con `?ruta=<slug>`.

## Pipeline de eventos

```bash
npm run events:build    # collect → normalize → dedupe → validate → publish atómico → report
npm run events:report   # resumen del último informe
```

- Fuentes en `automation/sources/source-registry.yml`.
- Caché cruda en `automation/cache/` (gitignored).
- Publica `src/data/events.json` y `public/data/events.json` solo si la validación pasa.
- Ante fallo de red o lista vacía inesperada: **se conserva la última publicación válida**.

### Estados de evento

| Estado | Uso |
| --- | --- |
| `published` | Visible en agenda si no ha caducado |
| `expired` | Historial / noindex; fuera de «próximos» |
| `needs-review` / `draft` | No auto-publicar en MVP (niveles C/D) |
| `cancelled` / `postponed` | Reservados cuando la fuente lo indique |

### Revisión diaria (Mac Mini / OpenCloud) — sin commit automático

```bash
cd /Users/open-ia-01/Company/Repos/retiro-interactivo
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm ci --legacy-peer-deps
npm run events:build
npm run validate:data
npm run check
npm run build
# Revisar reports/event-build-report.json y diff humano antes de cualquier commit
```

No instalar cron/launchd sin autorización. No hacer push automático.

## Candidatos editoriales

- Lugares: `data/candidates/places-candidates.json` + `automation/content/*`
- Eventos: `data/candidates/events-candidates.json` tras `events:normalize`
- Nunca mezclar candidatos con publicados sin validación editorial.

## Privacidad de ubicación

- Solo tras gesto ◎; sin almacenamiento ni envío; ✕ para quitar.
- Con ruta activa: ubicación solo para proximidad, no para navegación.

## Documentación

- `docs/content-model.md`
- `docs/routes.md`
- `docs/event-pipeline.md`
- `docs/event-editorial-policy.md`
- `docs/data-sources.md`
- `docs/qa-phase-2b.md`
- `docs/beta-readiness.md`
- `docs/implementation-log.md`

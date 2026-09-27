# Retiro Interactivo

Mapa digital **mobile first** del Parque del Retiro de Madrid. Experiencia visual de exploración (metáfora de mapa de parque temático), no una web turística convencional.

**Estado (6 de septiembre de 2026):** Iteración 1 cerrada técnicamente en local (agenda dinámica, contrato Madrid, recolección del 6 de septiembre y E2E del build). Beta técnica; **no** está abierta a testers. Candidato en rama `codex/iteracion-1-agenda-fiable`, sin publicar en GitHub Pages.

**Revisión:** [Auditoría del 6 de septiembre](docs/auditoria-producto-2026-09-06.md). **QA de esta iteración:** [docs/iteracion-1/qa.md](docs/iteracion-1/qa.md).

**Roadmap:** [Agenda e información fiables → Experiencia de visita → Beta en campo](docs/master-product.md). Stack: Astro + React islands + MapLibre + PWA.

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
npm run test:e2e
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

La agenda en el navegador evalúa «Hoy», caducidad y antigüedad en cliente. Un rebuild no es necesario para que un evento deje de mostrarse como vigente.

- Fuentes en `automation/sources/source-registry.yml`.
- Contrato temporal: `docs/iteracion-1/contrato-temporal.md`.
- Caché cruda en `automation/cache/` (gitignored). **No acredita consulta reciente.**
- `lastCheckedAt` solo se escribe tras un fetch validado. `--offline` o un error de red no publican ni rejuvenecen fechas.
- Publica `src/data/events.json`, `public/data/events.json`, GeoJSON y `events-publication.json` juntos, o restaura el conjunto anterior.
- Frescura: ≤48 h visible; 48 h–7 d con aviso; >7 d o fecha desconocida fuera de planes vigentes.

### Actualización automática

El workflow **Refresh agenda** (`.github/workflows/refresh-agenda.yml`) ejecuta el pipeline cada día a las 04:17 UTC (06:17 Madrid en verano, 05:17 en invierno), aplica guardias (fallo de recolección, 0 próximos o caída > 60 %), pasa las comprobaciones, confirma en `beta` y lanza el despliegue de Pages. Manual: Actions → Refresh agenda → Run workflow, o `gh workflow run refresh-agenda.yml --ref beta`. Detalles en `docs/event-pipeline.md`.

### Actualización local

```bash
cd /Users/open-ia-01/Company/Repos/retiro-interactivo
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm ci --legacy-peer-deps
npm run events:build
# Revisar reports/event-build-report.json (altas, bajas, descartes, complete: true)
npm run validate:data
npm run check
BASE=/retiro-interactivo SITE=https://tritonrules.github.io npm run build
```

La actualización programada vive en GitHub Actions; no instalar cron/launchd locales.

### Estados de evento

| Estado | Uso |
| --- | --- |
| `published` | Visible en agenda si no ha caducado y la consulta es reciente (≤7 días) |
| `expired` | Historial / noindex; fuera de «próximos» |
| `needs-review` / `draft` | No auto-publicar en MVP (niveles C/D) |
| `cancelled` / `postponed` | Reservados cuando la fuente lo indique |

### Revisión diaria

La hace el workflow **Refresh agenda** en GitHub Actions (ver arriba). Si falla, GitHub avisa por correo; el procedimiento local sirve para diagnosticar.

## Pruebas E2E

`npm run test:e2e` construye `dist-e2e/` con fixtures (`E2E_FIXTURE=1`) y sirve también el candidato `dist/` si ya existe. No usa `astro dev`. Un enlace inexistente responde 404, no el mapa.

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
- `docs/iteracion-1/contrato-temporal.md`
- `docs/iteracion-1/revision-editorial.md`
- `docs/iteracion-1/qa.md`
- `docs/qa-phase-2b.md`
- `docs/beta-readiness.md`
- `docs/implementation-log.md`

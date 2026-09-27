# Pipeline de eventos

## Flujo

1. `events:collect` — descarga Madrid Open Data (UA identificable, timeout, reintentos, caché en `automation/cache/`). Un fetch fallido o `--offline` marca `complete: false` y **no** acredita `lastCheckedAt`.
2. Normalización + filtrado geográfico (`automation/normalizers/normalize-events.mjs`). Zona `Europe/Madrid` con reglas IANA, no offset por mes. Ver `docs/iteracion-1/contrato-temporal.md`.
3. Deduplicación por `sourceEventId` (fusión de exclusiones) y fingerprint título+sede+día+hora (un segundo pase no se borra).
4. Validación Zod (`automation/validators/validate-events.mjs` y `src/utils/validateEvents.ts`).
5. Publicación atómica del conjunto (JSON fuente, JSON público, GeoJSON, `events-publication.json`). Si un archivo falla a mitad, se restaura el conjunto anterior.
6. Informe en `reports/event-build-report.json` (intento) y metadata de publicación enlazada por `datasetHash`.

Orquestación: `npm run events:build`.

## Frescura

| Edad desde consulta satisfactoria | UI |
| --- | --- |
| ≤ 48 h | Programación visible. «Última consulta: …» |
| > 48 h y ≤ 7 días | Aviso de actualización; enlaces oficiales |
| > 7 días o fecha desconocida | Fuera de «Hoy» y próximos |

Una recolección incompleta no sustituye el conjunto publicado. El reporte de intento puede avanzar aunque la UI siga describiendo la última publicación válida.

## Seguridad editorial

- Fallo de red → conservar última publicación.
- Lista vacía con previos → no publicar (`empty-guard`).
- No inventar hora final ni «gratuito» si la fuente no lo indica (solo `free: 1` municipal).
- ISO con offset explícito o interpretación Madrid; horas inexistentes/ambiguas → `needs-review`.

## Filtrado geográfico

Entra si hay sede/parque explícito (CIEA, Casa de Vacas, Palacio de Cristal, etc.), coords en bbox ampliado con keyword fiable, o POI del catálogo.

**«Distrito Retiro» solo no basta.**

El CIEA El Retiro no se geocodifica en Casa de Fieras. Coordenadas curatoriales: `[-3.68618, 40.409435]` (Fernán Núñez 2). La Cabaña es otra sede (Fernán Núñez 10).

## Actualización automática (diaria)

Workflow `.github/workflows/refresh-agenda.yml` («Refresh agenda»).

- **Cuándo:** cada día a las **04:17 UTC** (`17 4 * * *`) = **06:17 en Madrid en verano (CEST)** y **05:17 en invierno (CET)**. Minuto fuera de la hora en punto para evitar picos de cola de GitHub. GitHub puede retrasar los cron unos minutos (o más en horas punta); el margen de frescura (48 h) lo absorbe.
- **Qué hace:** checkout de `beta` → `npm ci` → `events:build` → `events:report` → `events:guard` → `events:validate` → `validate:data` → `check` (astro check + tsc + tests unitarios) → `lint` → `build` con `SITE`/`BASE` de Pages. Si todo pasa, commit como `github-actions[bot]` («chore(agenda): actualización automática AAAA-MM-DD») y push a `beta`.
- **Despliegue:** un push hecho con `GITHUB_TOKEN` no dispara otros workflows, así que el propio job lanza `deploy-pages.yml` con `gh workflow run deploy-pages.yml --ref beta` (los `workflow_dispatch` sí se permiten con `GITHUB_TOKEN`). Ese despliegue repite lint, check, build y E2E antes de publicar.
- **Permisos:** `contents: write` (push) y `actions: write` (lanzar el despliegue), solo en ese job; el resto, `contents: read`. `concurrency: refresh-agenda` evita ejecuciones solapadas (no cancela la que está en curso).
- **Archivos confirmados:** `src/data/events.json`, `src/data/events-publication.json`, `public/data/events.json`, `public/data/events.geojson`, `public/data/events-publication.json`, `public/data/event-build-report.json` y `reports/event-build-report.json`. El informe fechado `reports/iteracion-1/AAAA-MM-DD-events-attempt.json` **no** se confirma (se sube como artefacto `agenda-report` junto con el informe, 14 días).

### Guardias (no se sobrescribe nada y el job falla → GitHub avisa por correo)

| Situación | Dónde se detecta |
| --- | --- |
| Error de red, HTTP o recolección incompleta en cualquiera de las dos fuentes | `events:build` (sale con código 1, conserva la publicación anterior) |
| Validación Zod fallida | `events:build` y `events:validate` |
| Conjunto vacío con previos (`empty-guard`) | `events:build` |
| **0 eventos próximos** en el conjunto nuevo | `events:guard` |
| **Caída > 60 %** de eventos próximos frente al conjunto anterior (evaluado en el mismo instante, así lo ya caducado no cuenta como pérdida; solo si antes había ≥ 10 próximos) | `events:guard` |
| Fallo de `validate:data`, `check`, `lint` o `build` | pasos del workflow |

Umbrales en `automation/lib/refresh-guard.mjs` (`REFRESH_GUARD`), con tests en `src/utils/refreshGuard.test.ts`.

### Frescura y re-verificación

`lastCheckedAt` de cada evento (y `events-publication.json`) se reescribe en cada recolección satisfactoria, **aunque la programación no cambie**. Por eso el workflow confirma cada día aunque solo cambien las marcas de tiempo: esa re-verificación es la que mantiene la agenda dentro de la ventana de frescura (≤ 48 h visible, 48 h–7 d con aviso, > 7 d fuera). Si el workflow falla varios días seguidos, la agenda muestra primero el aviso y, pasados 7 días, el estado «Agenda pendiente de actualización».

### Ejecución manual

- Desde GitHub: pestaña **Actions → Refresh agenda → Run workflow** (rama `beta`).
- Desde la terminal: `gh workflow run refresh-agenda.yml --ref beta` y `gh run watch`.

El cron solo se ejecuta desde la rama por defecto (`beta`); no corre en forks (`if: github.repository == 'TritonRules/retiro-interactivo'`).

### Si falla

1. Abrir la ejecución fallida y leer el resumen («Guardia de agenda») y el artefacto `agenda-report`.
2. Error de red o de la fuente: suele resolverse en la siguiente ejecución; se puede relanzar a mano.
3. Caída sospechosa: revisar si el Ayuntamiento cambió el dataset o el formato. Si la caída es real, actualizar localmente (abajo), revisar y abrir un PR.

## Actualización local

Procedimiento local: `events:build` → `events:guard -- --previous <copia del events.json anterior>` → revisar informe → `validate:data` → `check` → `build` con `BASE`/`SITE` de Pages.

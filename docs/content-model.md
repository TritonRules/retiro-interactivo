# Modelo de contenido (Fase 2B)

## Colecciones publicadas

| Colección | Archivo | Páginas |
| --- | --- | --- |
| Lugares | `src/data/places.json` | `/lugares/<slug>/` |
| Servicios | `src/data/services.json` | Ficha de mapa (sin SEO individual obligatorio) |
| Rutas | `src/data/routes.json` | `/rutas/`, `/rutas/<slug>/` |
| Eventos | `src/data/events.json` | `/agenda/`, `/agenda/<slug>/` |

## Campos ampliados de lugar

Opcionales: `alternativeNames`, `audience`, `recommendedDurationMinutes`, `bestFor`, `area` (`retiro` \| `entorno`), `sourceTier`.

No se hacen obligatorios campos no fiables (horarios, precios, accesibilidad completa).

## Calidad

- Objetivo 60–100 fichas totales (lugares + servicios). Iteración 1: **82** (38 lugares + 44 servicios).
- Descripciones propias y breves; fuente + `lastVerifiedAt`.
- Duplicados: consolidar por id/slug/proximidad/nombre (`automation/content/detect-duplicates.mjs`).
- Candidatos en `data/candidates/` separados de publicados.
- Agenda: filtros y «Hoy» se resuelven en cliente. El HTML estático lista fechas absolutas. Contrato: `docs/iteracion-1/contrato-temporal.md`.

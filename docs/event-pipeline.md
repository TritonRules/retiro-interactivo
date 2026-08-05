# Pipeline de eventos

## Flujo

1. `events:collect` — descarga Madrid Open Data (UA identificable, timeout, reintentos, caché en `automation/cache/`).
2. Normalización + filtrado geográfico (`automation/normalizers/normalize-events.mjs`).
3. Deduplicación por `sourceEventId` y por título+fecha+lugar.
4. Validación Zod (`automation/validators/validate-events.mjs`).
5. Publicación atómica (`*.tmp` + rename) a `src/data/events.json` y `public/data/*`.
6. Informe en `reports/event-build-report.json`.

Orquestación: `npm run events:build`.

## Seguridad editorial

- Fallo de red → conservar última publicación.
- Lista vacía con previos → no publicar (`empty-guard`).
- No inventar hora final ni «gratuito» si la fuente no lo indica (solo `free: 1` municipal).
- Zona horaria Europe/Madrid en ISO con offset.

## Filtrado geográfico

Entra si hay sede/parque explícito (CIEA, Casa de Vacas, Palacio de Cristal, etc.), coords en bbox ampliado con keyword fiable, o POI del catálogo.

**«Distrito Retiro» solo no basta.**

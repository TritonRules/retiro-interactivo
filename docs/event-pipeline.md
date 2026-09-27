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

## Actualización

Procedimiento local: `events:build` → revisar informe → `validate:data` → `check` → `build` con `BASE`/`SITE` de Pages. Sin cron ni publicación automática en la Iteración 1.

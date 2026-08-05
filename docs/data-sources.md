# Fuentes de datos — Fase 1

## Cartografía

| Recurso | Uso | URL |
| --- | --- | --- |
| OpenStreetMap | Nombres y coordenadas de lugares | https://www.openstreetmap.org/ |
| Nominatim | Búsqueda inicial de candidatos | https://nominatim.openstreetmap.org/ |
| Overpass API | Confirmación en bbox del Retiro | https://overpass-api.de/ |
| OpenFreeMap | Estilo Liberty / teselas | https://tiles.openfreemap.org/styles/liberty |
| MapLibre GL JS | Renderizado del mapa | https://maplibre.org/ |

## Lugares (20)

Cada registro en `src/data/places.json` incluye `sourceName`, `sourceUrl` y `lastVerifiedAt`.
Fecha de contraste de esta fase: **2026-08-05**.

Método:

1. Consulta Nominatim (user-agent propio del prototipo).
2. Cruce Overpass en bbox aproximado del parque cuando Nominatim falló o fue ambiguo.
3. Descripciones redactadas de nuevo (no se copian textos extensos de las fuentes).

## Limitaciones

- OSM puede contener errores o nombres locales distintos a la denominación turística habitual.
- No se verificaron horarios de edificios culturales en esta fase.
- No se descargaron fotografías de terceros.

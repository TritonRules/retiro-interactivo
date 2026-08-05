# Fuentes de datos

## Cartografía

| Recurso | Uso | URL |
| --- | --- | --- |
| OpenStreetMap | Nombres y coordenadas | https://www.openstreetmap.org/ |
| Nominatim | Búsqueda de candidatos | https://nominatim.openstreetmap.org/ |
| Overpass API | Confirmación en bbox del Retiro | https://overpass-api.de/ |
| OpenFreeMap | Estilo Liberty / teselas | https://tiles.openfreemap.org/styles/liberty |
| MapLibre GL JS | Renderizado del mapa | https://maplibre.org/ |

## Lugares (20)

Archivo: `src/data/places.json`. Fecha de contraste: **2026-08-05**.  
Matriz editorial: `docs/poi-review.md`.

## Servicios (25) — Fase 2A

Archivo: `src/data/services.json` + `public/data/services.geojson`.

Tipos priorizados: aseos, fuentes de **agua potable** (`amenity=drinking_water`), zonas infantiles, accesos/puertas, paneles de información y el Centro Deportivo La Chopera.

Método: Overpass en bbox del Retiro (2026-08-05). Descripciones propias. No se inventan horarios ni operatividad.

### Huecos conocidos

- Varios aseos OSM sin confirmación de apertura continua → algunos `needs-review`.
- No se incluyen restaurantes externos al perímetro útil del parque.
- Fuentes ornamentales (Ángel Caído, Alcachofa, Galápagos) **no** se etiquetan como agua potable.
- Accesibilidad `wheelchair=*` de OSM no sustituye una auditoría in situ.
- Disponibilidad real de aseos y agua: pendiente de paseo de verificación.

## Limitaciones

- OSM puede contener errores o nombres locales distintos a la denominación turística.
- Sin fotografías de terceros.
- Sin horarios municipales verificados en esta fase.

# Fuentes de datos

## Cartografía

| Recurso | Uso | URL |
| --- | --- | --- |
| OpenStreetMap | Nombres y coordenadas | https://www.openstreetmap.org/ |
| Nominatim | Búsqueda de candidatos | https://nominatim.openstreetmap.org/ |
| Overpass API | Confirmación en bbox del Retiro; extracción de servicios (`npm run services:osm`) | https://overpass-api.de/ |
| OpenFreeMap | Estilo Liberty / teselas | https://tiles.openfreemap.org/styles/liberty |
| MapLibre GL JS | Renderizado del mapa | https://maplibre.org/ |

## Servicios OSM (extracción automática)

Archivo generado: `src/data/services-osm.json` (`npm run services:osm`), 65 servicios nuevos
a 2026-09-28 (cafés, bares, heladerías, quioscos, aseos, agua potable, parques infantiles,
gimnasios al aire libre…). © colaboradores de OpenStreetMap, **ODbL 1.0**. Detalle, reglas
de deduplicación y estudio de precios: `docs/servicios-osm.md`.

Información verificada de algunos locales (teléfono, horario con fuente, precios con fecha,
estado): `src/data/services-info.json`. Solo fuentes oficiales o del propio local; los precios
se marcan a los 9 meses y se ocultan a los 12 (reglas en `docs/servicios-osm.md`).

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


## Fase 2B — Agenda y registro

Registro vivo: `automation/sources/source-registry.yml`.

| id | Recurso | Tier | Licencia | auto_publish |
| --- | --- | --- | --- | --- |
| madrid-agenda-general | Agenda de actividades y eventos | A | CC BY 4.0 | sí |
| madrid-agenda-cultural-100 | Actividades culturales 100 días | A | CC BY 4.0 | sí |
| distrito-retiro-agenda | Distrito Retiro | B | por determinar | no (disabled) |
| ciea-retiro | CIEA El Retiro | B | por determinar | no (disabled) |

URLs de descarga verificadas 2026-08-05 (HTTP 200).
Atribución: Ayuntamiento de Madrid — datos abiertos.
Lugares/servicios adicionales: OpenStreetMap + Nominatim (UA identificable), verificados 2026-08-05.

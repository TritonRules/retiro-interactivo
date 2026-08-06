# Revisión editorial de eventos — Fase 3

Fecha: 2026-08-06. Fuente: Madrid Open Data (tier A), pipeline `events:build`.

## Resumen

| Concepto | Cantidad |
| --- | --- |
| Publicados tras corrección | **73** |
| Sedes distintas | 6 (todas dentro del parque / CIEA / Cabaña / Casa de Vacas / Títeres / Biblioteca) |
| Falsos positivos descartados | **0** (el filtro «Distrito Retiro solo» sigue rechazando barrios) |
| Descartes totales del pipeline | ~1328 |
| Duplicados eliminados | ~74 |

## Correcciones aplicadas

1. **CIEA — coordenadas municipales erróneas**  
   Lat/lon del dataset apuntaban al sur del parque (~40.409, -3.686). Se priorizan coordenadas curatoriales alineadas al catálogo (~40.4165, -3.6789).  
   Motivo: `venue-curated` en el normalizador.

2. **Casa de Vacas / Títeres / Biblioteca / Jardines**  
   Alineadas al catálogo OSM del proyecto cuando el venue es reconocible.

3. **Aula ambiental La Cabaña del Retiro**  
   Incluida explícitamente (sede real del parque). Pasa de 3 a 10 eventos al reconocer el patrón; no es expansión de lugares, es corrección de filtro.

## Ubicaciones ambiguas (sin descarte)

| Venue | Eventos | Nota |
| --- | --- | --- |
| Jardines de El Buen Retiro | 1 | Punto genérico del parque; precisión baja |
| Exposiciones plurimensuales | 3 | Ya iniciadas (p. ej. BIC 90 años); válidas hasta `endAt` |

## No descartados

Eventos culturales en Casa de Vacas con títulos de países/artistas (Paraguay, Venezuela, etc.) **sí** pertenecen al recinto del parque.

## Pendiente físico / humano

- Confirmar in situ la sede exacta del CIEA frente a La Cabaña.
- Revisar horarios reales el día de la visita (la fuente municipal puede cambiar).

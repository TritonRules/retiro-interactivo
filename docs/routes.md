# Rutas temáticas

Exactamente **cinco** rutas iniciales en `src/data/routes.json`:

| Slug | Nombre | Duración aprox. | Distancia aprox. | Paradas |
| --- | --- | --- | --- | --- |
| `retiro-imprescindible` | El Retiro imprescindible | ~90 min | ~2,1 km | 6 |
| `retiro-en-una-hora` | El Retiro en una hora | ~60 min | ~1,5 km | 6 |
| `retiro-con-ninos` | El Retiro con niños | ~75 min | ~2,6 km | 6 |
| `ruta-fotografica` | Ruta fotográfica | ~100 min | ~2,3 km | 7 |
| `caminar-o-correr` | Caminar o correr por El Retiro | ~50 min | ~4,2 km | 6 |

Las distancias son las del recorrido real por los paseos, no la línea recta entre paradas.

## Reglas

- Geometría `LineString` predefinida (sin APIs de routing en ejecución).
- Se regenera con `npm run routes:paths` sobre la red peatonal de OSM; ver `docs/routes-validation.md`.
- Todos los `stopIds` deben existir en lugares.
- URL estable en mapa: `?ruta=<slug>`.
- Sin frases de navegación («gira a la derecha»).
- Aviso de cierres/obras; «caminar o correr» no es instalación homologada.
- Validación: `npm run routes:validate`.

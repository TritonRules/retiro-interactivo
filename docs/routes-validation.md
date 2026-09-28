# Validación de rutas — Fase 3

Fecha de la última regeneración: 2026-08-09.

Los trazados dejaron de dibujarse a mano: `npm run routes:paths` reconstruye cada
`LineString` recorriendo la red peatonal del parque publicada en OpenStreetMap
(`footway`, `path`, `pedestrian`, `steps`, `living_street`, `track` y `service`,
descartando `access=private/no` y todo lo que quede fuera del recinto). El script
engancha cada parada a su nodo transitable más cercano, calcula el camino más corto
entre paradas consecutivas —penalizando escaleras y viales de servicio— y simplifica
el resultado a 3 m. La salida queda como GeoJSON estático en `src/data/routes.json`:
la aplicación no consulta ningún servicio de routing en ejecución.

| Slug | Distancia antes | Distancia ahora | Vértices | Paradas | Estado |
| --- | --- | --- | --- | --- | --- |
| `retiro-imprescindible` | ~1590 m | ~2070 m | 21 → 54 | 6 | Sobre caminos reales |
| `retiro-en-una-hora` | ~982 m | ~1450 m | 15 → 36 | 6 | Sobre caminos reales |
| `retiro-con-ninos` | ~1961 m | ~2570 m | 18 → 57 | 6 | Sobre caminos reales |
| `ruta-fotografica` | ~1415 m | ~2330 m | 18 → 58 | 7 | Sobre caminos reales |
| `caminar-o-correr` | ~3119 m | ~4170 m | 24 → 74 | 6 | Circular, sobre caminos reales |
| `ruta-estatuas` (2026-09-28) | — | ~3080 m | 70 | 13 | Nueva, sobre caminos reales |

Las duraciones estimadas no cambian: seguían siendo razonables para la distancia
real de cada recorrido (la más ajustada, `caminar-o-correr`, son 4,2 km en ~50 min).

### Ruta de las estatuas (2026-09-28)

`ruta-estatuas` se generó sin tocar las otras cinco:
`node scripts/routes-build-paths.mjs --only=ruta-estatuas`. La opción `--only=<slug>`
solo reescribe esa ruta. Tras simplificar, el script densifica los tramos rectos
largos (máx. 300 m entre vértices), porque la prueba de geometría no admite saltos de
más de 450 m. Paradas enganchadas a 5–26 m del camino. 3080 m en ~100 min (~1,8 km/h,
con tiempo para mirar cada estatua).

## Defectos corregidos (QA físico en iPhone, 2026-08-09)

- **Trazados que no seguían caminos.** Las cinco rutas unían paradas con tramos
  rectos: las cinco cruzaban el Estanque Grande y varias atravesaban zonas sin
  sendero. Regenerado todo con la red peatonal de OSM.
- **`ruta-fotografica` no llegaba a su última parada.** La línea terminaba junto al
  Monumento a Alfonso XII, a 593 m de La Rosaleda, que quedaba suelta en el mapa.
  Ahora el trazado recorre las siete paradas en orden y acaba a 10 m de la séptima.
- **`retiro-imprescindible` empezaba lejos de su primera parada.** El primer vértice
  estaba a 104 m de la Puerta de Felipe IV; ahora arranca sobre ella.

## Validación automática

`src/utils/routes.geometry.test.ts` comprueba, para todas las rutas:

- `LineString` con al menos dos coordenadas, todas dentro del parque;
- sin vértices repetidos y sin saltos mayores de 450 m;
- inicio sobre la primera parada y final sobre la última (o sobre la primera si es
  circular), con 60 m de tolerancia para centroides de estanques y explanadas;
- paso por todas las paradas **en el orden declarado**;
- ninguna intersección con las láminas de agua del parque
  (`src/utils/__fixtures__/park-water.json`, extraído de OSM);
- `approximateDistanceMeters` coherente (±10 %) con la longitud real del trazado.

## Pendiente de validación física

- Caminar las seis rutas in situ (la de las estatuas aún no se ha recorrido).
- Verificar cierres temporales / obras.
- Confirmar que «caminar o correr» no invade zonas restringidas.

## Prueba en navegador (Chromium embebido)

- `/rutas/` lista las cinco rutas con duración/distancia — OK.
- `?ruta=` ahora se lee en cliente (fix Fase 3; Astro estático no ve query en build).
- Smoke de las cinco rutas a 390×844, 430×932 y 1440×900 (2026-08-09): trazado
  visible, número de paradas correcto, sin desbordes ni errores de consola.

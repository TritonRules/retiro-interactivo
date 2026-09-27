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

## Modo paseo guiado

«Empezar ruta» (en la ficha `/rutas/<slug>/` → `?ruta=<slug>&paseo=1`, o en la tarjeta de ruta del
mapa) guía la ruta parada a parada. Lógica pura en `src/utils/guidedWalk.ts` (con tests); estado y
geolocalización en `src/components/map/useGuidedWalk.ts`; panel en `GuidedWalkPanel.tsx`.

- `watchPosition` con alta precisión solo mientras el paseo está activo y la página visible; se
  cancela al terminar, al completar, al cambiar de ruta, al ocultar la página y al desmontar. Nada
  se guarda ni se envía.
- Llegada: radio de 25 m + distancia de la parada al trazado (tope +60 m; p. ej. el centro del
  Estanque Grande queda a ~56 m del paseo) + margen por precisión GPS (tope +15 m). Con precisión
  peor de 75 m la posición se muestra pero no marca llegadas. Solo cuenta la siguiente parada, en
  orden; se puede saltar o volver atrás a mano.
- Al llegar se abre la ficha del lugar (con sus vídeos si los tiene) y se avanza. En la última
  parada se muestra «Ruta completada».
- Distancia a la siguiente parada en línea recta; tiempo estimado a 4,5 km/h.
- Fuera del Retiro, con permiso denegado o sin contexto seguro se ofrece el **modo demostración**:
  recorre el trazado a 12 m/s (simulación acelerada) sin usar la ubicación.
- Wake Lock de pantalla si el navegador lo soporta; los fallos se ignoran.
- Sin WebGL2 el panel y las fichas siguen funcionando (sin mapa).
- `paseo=1` no se conserva en la URL (no se comparte ni se relanza al recargar).

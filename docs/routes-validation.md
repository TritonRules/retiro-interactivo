# Validación de rutas — Fase 3

Fecha: 2026-08-06.

| Slug | Distancia | Paradas | Saltos >250 m | Estado |
| --- | --- | --- | --- | --- |
| `retiro-imprescindible` | ~1590 m | 6 | 0 | OK técnico |
| `retiro-en-una-hora` | ~982 m | 6 | 0 | OK técnico (corta; pensada con pausas) |
| `retiro-con-ninos` | ~1961 m | 6 | 0 (corregido; antes 1×593 m) | OK técnico |
| `ruta-fotografica` | ~1415 m | 7 | 0 | OK técnico |
| `caminar-o-correr` | ~3119 m | 6 | 0 | OK técnico; aviso «no homologada» presente |

## Defecto corregido

- **retiro-con-ninos:** el primer tramo unía Teatro de Títeres → biblioteca en línea casi directa (~593 m). Se insertaron vértices intermedios por paseos norte/este. Distancia recalculada ~1961 m.

## Pendiente de validación física

- Caminar las cinco rutas in situ.
- Verificar cierres temporales / obras.
- Confirmar que «caminar o correr» no invade zonas restringidas.

## Prueba en navegador (Chromium embebido)

- `/rutas/` lista las cinco rutas con duración/distancia — OK.
- `?ruta=` ahora se lee en cliente (fix Fase 3; Astro estático no ve query en build).

# Modelo de contenido (Fase 2B)

## Colecciones publicadas

| Colección | Archivo | Páginas |
| --- | --- | --- |
| Lugares | `src/data/places.json` | `/lugares/<slug>/` |
| Servicios | `src/data/services.json` | Ficha de mapa (sin SEO individual obligatorio) |
| Rutas | `src/data/routes.json` | `/rutas/`, `/rutas/<slug>/` |
| Eventos | `src/data/events.json` | `/agenda/`, `/agenda/<slug>/` |

## Campos ampliados de lugar

Opcionales: `alternativeNames`, `audience`, `recommendedDurationMinutes`, `bestFor`, `area` (`retiro` \| `entorno`), `sourceTier`.

No se hacen obligatorios campos no fiables (horarios, precios, accesibilidad completa).

## Calidad

- Objetivo 60–100 fichas totales (lugares + servicios). Iteración 1: **82** (38 lugares + 44 servicios).
- Descripciones propias y breves; fuente + `lastVerifiedAt`.
- Duplicados: consolidar por id/slug/proximidad/nombre (`automation/content/detect-duplicates.mjs`).
- Candidatos en `data/candidates/` separados de publicados.
- Agenda: filtros y «Hoy» se resuelven en cliente. El HTML estático lista fechas absolutas. Contrato: `docs/iteracion-1/contrato-temporal.md`.

## Vídeos de lugares y rutas

Lugares (`src/data/places.json`) y rutas (`src/data/routes.json`) admiten un campo opcional `videos`. Sin él (o con `[]`) no se muestra nada. El contenido principal del canal son **paseos grabados recorriendo las rutas**, con versiones por condición (lluvia, otoño, nieve…); por eso las rutas son el sitio natural de los vídeos, con varios por ruta, uno por escenario.

Dónde aparece el bloque «Vídeos»:

| Lugar | Comportamiento |
| --- | --- |
| Tarjeta de ruta activa en el mapa (`?ruta=`) | **Plegado** tras el botón «Ver vídeo(s) del recorrido» con una pista (nº de vídeos y escenarios); se despliega en línea |
| Página `/rutas/<slug>/` | Desplegado |
| Ficha del mapa (`?lugar=`) y página `/lugares/<slug>/` | Desplegado |

Con **dos o más vídeos con `scenario`** se muestra un selector de escenario (chips, `role="radiogroup"`, flechas/Inicio/Fin) y un único vídeo; cambiar de escenario vuelve a la miniatura. Si no, se listan todos. Vídeo inicial: el pedido por URL, si no el general (sin `scenario`), si no `soleado`, si no el primero.

Enlace directo a un escenario: `?ruta=<slug>&escenario=lluvia` (tarjeta del mapa, abre desplegada) o `/rutas/<slug>/?escenario=lluvia`. Un escenario inexistente se ignora.

Para añadir un vídeo basta con editar los datos y publicar. Ejemplo de ruta con dos paseos:

```json
"videos": [
  {
    "youtubeId": "XXXXXXXXXXX",
    "title": "El Retiro imprescindible, paseo completo",
    "kind": "visita",
    "scenario": "soleado",
    "durationSeconds": 1260
  },
  {
    "youtubeId": "https://youtu.be/YYYYYYYYYYY",
    "title": "El Retiro imprescindible bajo la lluvia",
    "kind": "visita",
    "scenario": "lluvia"
  }
]
```

| Campo | Obligatorio | Regla |
| --- | --- | --- |
| `youtubeId` | sí | Id de 11 caracteres (`[A-Za-z0-9_-]`). También se acepta la URL (`youtube.com/watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`); se normaliza al id |
| `title` | sí | En español, 3–120 caracteres |
| `description` | no | Hasta 400 caracteres |
| `kind` | no | Ver tabla de tipos |
| `scenario` | no | Ver tabla de escenarios. Ausente = «General» |
| `durationSeconds` | no | Entero positivo (máx. 4 h) |

Tipos (`kind`):

| Valor | Etiqueta |
| --- | --- |
| `visita` | Paseo |
| `infografia` | Infografía |
| `3d` | 3D |
| `ia` | Animación IA |

Escenarios (`scenario`):

| Valor | Etiqueta |
| --- | --- |
| `soleado` | Soleado |
| `lluvia` | Lluvia |
| `otono` | Otoño |
| `primavera` | Primavera |
| `viento` | Viento |
| `frio` | Frío |
| `nieve` | Nieve |
| `atardecer` | Atardecer |
| `noche` | Noche |

Reglas de validación (`npm run validate:data` y el build fallan si no se cumplen):

- Sin campos desconocidos; `kind` y `scenario` solo con los valores de las tablas.
- Un mismo `youtubeId` no puede repetirse en el mismo lugar o ruta.
- **Como mucho un vídeo por combinación escenario + tipo** (ausentes cuentan como «general»). Se permiten, p. ej., un paseo y una animación IA del mismo escenario; no dos paseos con lluvia.

Añadir un escenario o un tipo nuevo: una línea en `VIDEO_SCENARIO_LABELS` / `VIDEO_KIND_LABELS` de `src/utils/videos.shared.mjs` (fuente única para validador y UI), añadir el valor al tipo de `src/types/video.ts` y a la tabla de arriba. `videos.test.ts` falla si el tipo y el vocabulario no coinciden.

La app muestra la miniatura estática (`i.ytimg.com`) y solo carga el reproductor de `youtube-nocookie.com` al pulsar «Reproducir»; incluye un enlace «Ver en YouTube». El service worker no cachea YouTube.

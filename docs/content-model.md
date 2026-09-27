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

Lugares (`src/data/places.json`) y rutas (`src/data/routes.json`) admiten un campo opcional `videos`. Sin él (o con `[]`) no se muestra nada. Con al menos un vídeo aparece el bloque «Vídeos» en la ficha del mapa (`?lugar=`), la página `/lugares/<slug>/`, la tarjeta de ruta activa (`?ruta=`) y `/rutas/<slug>/`.

Para añadir un vídeo basta con editar los datos y publicar: añadir el campo al objeto del lugar o de la ruta.

```json
"videos": [
  {
    "youtubeId": "XXXXXXXXXXX",
    "title": "El Palacio de Cristal en 3D",
    "description": "Cómo se construyó el invernadero de 1887.",
    "kind": "3d",
    "durationSeconds": 95
  }
]
```

| Campo | Obligatorio | Regla |
| --- | --- | --- |
| `youtubeId` | sí | Id de 11 caracteres (`[A-Za-z0-9_-]`). También se acepta la URL (`youtube.com/watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`); se normaliza al id |
| `title` | sí | En español, 3–120 caracteres |
| `description` | no | Hasta 400 caracteres |
| `kind` | no | `infografia` \| `3d` \| `ia` \| `visita` |
| `durationSeconds` | no | Entero positivo (máx. 4 h) |

`npm run validate:data` y el build fallan con entradas mal formadas, campos desconocidos o vídeos repetidos en el mismo lugar o ruta. La app muestra la miniatura estática y solo carga el reproductor de `youtube-nocookie.com` al pulsar «Reproducir»; incluye un enlace «Ver en YouTube».

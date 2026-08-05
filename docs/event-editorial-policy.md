# Política editorial de eventos

| Tier | Origen | Publicación automática |
| --- | --- | --- |
| A | Oficial estructurado (datos abiertos Madrid) | Sí, tras schema + dedupe + geo |
| B | Oficial no estructurado | Solo con parser específico aprobado |
| C | Organizador verificado | Draft / needs-review |
| D | Medios / agregadores | Solo descubrimiento |

## Prohibido en MVP

- Scraping de redes sociales como fuente única.
- Descripciones generativas presentadas como oficiales.
- Publicar sin título, fecha, fuente y localización suficiente.
- Sustituir `events.json` por vacío ante error.

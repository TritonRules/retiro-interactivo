# Registro de implementación — Fase 1

## 2026-08-05

- Creado proyecto Astro 7 + TypeScript estricto + React islands únicamente para mapa/ficha.
- Estilo de mapa centralizado en `src/config/map.ts` con OpenFreeMap Liberty (`https://tiles.openfreemap.org/styles/liberty`).
- 20 lugares iniciales contrastados con OpenStreetMap / Nominatim / Overpass; descripciones propias.
- Validación Zod en build (`src/utils/places.ts`) y script `npm run validate:data`.
- UI mobile first: cabecera compacta, chips de filtro, bottom sheet en móvil / panel en escritorio.
- Workflow GitHub Actions `deploy-pages.yml` (build + Pages) sin secretos en el repo.
- `SITE` y `BASE` configurables por variables de entorno / GitHub Actions vars.

### Decisiones de denominación (OSM)

| Semilla | Nombre publicado | Nota OSM |
| --- | --- | --- |
| Estanque Grande del Retiro | Estanque Grande del Retiro | OSM: «El Estanque Grande» (way/4088758) |
| Montaña Artificial | Montaña Artificial | OSM nombra el pico «Montaña de los gatos» (node/618168584) |
| Parterre Francés | Parterre Francés | OSM: «Jardín del Parterre» (relation/20827650) |
| Paseo de la Argentina — Paseo de las Estatuas | Se conserva el doble nombre popular | OSM: «Paseo de la Argentina» |

### Decisiones técnicas

- Sin fuentes web externas bloqueantes: tipografía del sistema con stack expresivo.
- Sin clustering (20 marcadores): legibilidad suficiente con formas + color.
- Sin horarios inventados: solo notas cuando estén verificadas (ninguna en Fase 1).
- Contacto: `siteConfig.contactUrl` vacío a propósito hasta que el propietario lo configure.
- Verificación final local (2026-08-05): `validate:data`, `check`, `lint` y `build` OK (22 páginas estáticas).
- Aviso de build: el chunk de MapLibre supera 500 kB; aceptable en Fase 1 (carga diferida vía island `client:only`).

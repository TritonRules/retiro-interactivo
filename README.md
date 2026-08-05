# Retiro Interactivo

Mapa digital **mobile first** del Parque del Retiro de Madrid. Experiencia visual de exploración (metáfora de mapa de parque temático), no una web turística convencional.

**Estado:** Fase 1 / prototipo navegable.

## Stack técnico

- [Astro](https://astro.build/) + TypeScript (salida estática)
- React solo en islas interactivas (mapa / fichas)
- [MapLibre GL JS](https://maplibre.org/)
- Teselas/estilo [OpenFreeMap Liberty](https://openfreemap.org/quick_start/)
- Datos en JSON / GeoJSON dentro del repositorio
- Validación con Zod
- Despliegue previsto en GitHub Pages

## Requisitos locales

- Node.js **≥ 22.12**
- npm (incluido con Node)

En este entorno, si `node` no está en el PATH, usa por ejemplo:

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
```

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm run dev
```

Abre la URL que indique Astro. Con la configuración por defecto, la base es `/retiro-interactivo/` (compatible con GitHub Pages).

Para servir en la raíz en local:

```bash
BASE=/ SITE=http://localhost:4321 npm run dev
```

## Validación y build

```bash
npm run validate:data   # 20 lugares únicos + esquema
npm run check           # astro check + tsc + tests
npm run build           # valida datos y genera dist/
npm run preview         # previsualiza la salida estática
```

Otros:

```bash
npm run test
npm run lint
npm run format
```

## Estructura del proyecto

```text
/
├── .github/workflows/deploy-pages.yml
├── docs/
│   ├── master-product.md
│   ├── implementation-log.md
│   └── data-sources.md
├── public/data/places.geojson
├── scripts/validate-places.mjs
├── src/
│   ├── components/map|places|…
│   ├── config/map.ts|site.ts
│   ├── data/places.json
│   ├── layouts/
│   ├── pages/
│   ├── styles/
│   ├── types/
│   └── utils/
├── astro.config.mjs
└── package.json
```

## Cómo añadir un nuevo lugar

1. Añade un objeto en `src/data/places.json` siguiendo el tipo `Place` (`src/types/place.ts`).
2. Usa `id` y `slug` únicos (kebab-case).
3. Coordenadas `[lon, lat]` dentro de los límites del Retiro.
4. Redacta descripciones propias y enlaza `sourceUrl` real.
5. Actualiza `public/data/places.geojson` (o regenera desde el JSON).
6. Ejecuta `npm run validate:data` y `npm run build`.
7. Documenta la fuente en `docs/data-sources.md` si aporta contexto nuevo.

## Despliegue en GitHub Pages

1. Publica este repositorio en GitHub.
2. En **Settings → Pages**, origen: **GitHub Actions**.
3. (Opcional) Variables del repositorio:
   - `SITE` → p. ej. `https://tu-usuario.github.io`
   - `BASE` → p. ej. `/retiro-interactivo`
4. Haz push a `main` o lanza el workflow **Deploy GitHub Pages**.
5. La URL será `https://<usuario>.github.io/<repo>/`.

No se requieren tokens en el repositorio: el workflow usa `actions/deploy-pages` con `id-token`.

## Fuentes y atribución cartográfica

- Datos: © colaboradores de OpenStreetMap
- Teselas/estilo: OpenFreeMap
- Motor: MapLibre GL JS

La atribución es visible en el mapa. Detalle de contrastes: `docs/data-sources.md`.

## Limitaciones conocidas

- Prototipo sin geolocalización del usuario, rutas, agenda ni PWA completa.
- Sin fotografías de lugares (iconografía propia).
- Sin horarios verificados de edificios en Fase 1.
- Contacto del proyecto aún no configurado (`src/config/site.ts` → `contactUrl`).
- La precisión depende de OSM; cada ficha enlaza su fuente.

## Próximas fases (no implementadas)

- Fase 2: geolocalización, más POI/servicios, PWA instalable, mejora de datos y accesibilidad in situ.
- Fase 3+: rutas, agenda, recomendaciones, posible app nativa si hay uso recurrente.

## Documentación interna

- Visión: `docs/master-product.md`
- Decisiones: `docs/implementation-log.md`
- Fuentes: `docs/data-sources.md`

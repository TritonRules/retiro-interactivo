# Dependencia `--legacy-peer-deps`

## Problema

`@vite-pwa/astro@1.2.0` declara peer `astro: ^1.6.0 || … || ^5.0.0`.  
El proyecto usa **Astro 7.1.6**, por lo que `npm install` falla sin `--legacy-peer-deps`.

```text
invalid: astro@7.1.6 from node_modules/@vite-pwa/astro
```

`vite-plugin-pwa@1.3.0` sí admite Vite reciente; el cuello de botella es el peer de `@vite-pwa/astro`.

## Decisión Fase 3

- **Mantener** Astro 7 (ya estable en el MVP).
- **Mantener** instalación con `npm install --legacy-peer-deps` / `npm ci --legacy-peer-deps`.
- **No** forzar downgrade a Astro 5 (arriesgado para el resto del stack).
- **No** cambiar a otra librería PWA en esta fase.

## Seguimiento

- Vigilar releases de `@vite-pwa/astro` con peer Astro 6/7.
- Cuando exista versión compatible, eliminar `--legacy-peer-deps` y regenerar lockfile en una PR dedicada.

## Riesgo

Peer inválido puede ocultar incompatibilidades reales. Mitigación: `npm run build` + prueba PWA en cada release de beta.

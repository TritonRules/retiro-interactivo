# QA Fase 2B

## Automatizado (verificado)

- `npm run validate:data` — 36 lugares + 44 servicios + 5 rutas + eventos
- `npm run routes:validate`
- `npm run events:build` / `events:report`
- `npm run check` (astro check + tsc + 25 tests)
- `npm run lint`
- `npm run build` con `BASE=/retiro-interactivo` → 112 páginas + `sw.js` + manifest
- Guarda de publicación vacía

## Manual recomendado (navegador)

- [ ] `/rutas/` y ficha de ruta usable sin mapa
- [ ] `?ruta=retiro-imprescindible` dibuja línea y paradas; «Cerrar ruta»
- [ ] `/agenda/` Hoy / Próximamente; filtros; caducados fuera de próximos
- [ ] Nav compacta Mapa / Rutas / Agenda / Acerca en móvil
- [ ] Toggle servicios + toggle eventos sin saturar
- [ ] Offline fallback sigue respondiendo

## Pendiente físico / editorial

- Verificar in situ aseos/fuentes marcados `needs-review` o restauración.
- Revisar coordenadas municipales de algunos eventos CIEA.
- Contrastar trazados de rutas sobre el terreno.

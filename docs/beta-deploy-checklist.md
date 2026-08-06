# Checklist de despliegue beta privada (sin publicar aún)

## Pre-despliegue

- [x] Rama `feature/fase-3-private-beta` desde `6fcbce2`
- [x] `events:build` + `validate:data` + `check` + `lint` + `test` + `build`
- [x] Revisión editorial eventos documentada
- [x] Rutas validadas técnicamente
- [ ] Prueba manual Safari + Firefox + un Android
- [ ] Prueba geo real dentro/fuera del parque
- [ ] Install PWA en un dispositivo y actualizar tras nuevo build

## Publicación (pendiente de autorización)

1. Merge/PR a la rama de Pages cuando se autorice.
2. Variables: `SITE=https://tritonrules.github.io` `BASE=/retiro-interactivo`
3. `npm ci --legacy-peer-deps && npm run build`
4. Verificar Actions / Pages.
5. Avisar a testers: si ven UI antigua, «Actualizar» en el banner PWA o borrar datos del sitio.

## No hacer sin autorización

- Push a `main`
- Tag de release
- Anuncio público
- Añadir cuentas / chat / notificaciones

## Criterio de salida

Ver `docs/beta-readiness.md` — veredicto Fase 3.

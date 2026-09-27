# QA — Iteración 1 (Agenda e información fiables)

**Fecha:** 6 de septiembre de 2026  
**Rama local:** `codex/iteracion-1-agenda-fiable`  
**HEAD de partida:** `3d19d6a` (`beta` auditada)  
**Entorno:** Node v22.23.2, npm 10.9.8, darwin  
**Clasificación:** Iteración 1 cerrada técnicamente (candidato local). No hay push, merge a `beta` ni despliegue. CI remoto pendiente.

## Entorno y comandos de cierre

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm run validate:data   # 38 lugares + 44 servicios + 5 rutas + 74 eventos (68 próximos)
npm run events:validate # 74 eventos
npm run routes:validate # 5 rutas
npm run check           # astro check 0 errores; tsc; Vitest 103
npm run lint            # 0 problemas
BASE=/retiro-interactivo SITE=https://tritonrules.github.io npm run build  # 122 páginas en dist/
npm run test:e2e        # 22/22 (Chromium + WebKit agenda/SW; Firefox smoke del candidato)
git diff --check        # sin espacios conflictivos
```

Artefactos locales (no versionados): `dist/` (candidato), `dist-e2e/` (fixtures), `playwright-report/`, `test-results/`.

## G0 — Base y reproducción — pasa

| Campo | Valor |
| --- | --- |
| Estado | pasa |
| Evidencia | `reports/iteracion-1/2026-09-06-g0-baseline/` |
| Resultado | Rama creada desde `3d19d6a`. Conservados README, `docs/master-product.md` y `docs/auditoria-producto-2026-09-06.md`. Baseline: 73 eventos, `lastCheckedAt` 2026-08-06, hash `events.json` `7e12ff02…`. |

Defectos de partida (auditoría + HTML estático de `beta`):

1. Filtros de agenda en frontmatter de Astro: la URL cambiaba y el HTML no.
2. «Hoy» / próximos / mapa se calculaban al construir.
3. Offset de Madrid por mes: 30/03/2026 10:00 se veía a las 11:00.
4. `lastCheckedAt` al normalizar, también desde caché.
5. `test:e2e` salía 0 sin navegador.

Las pruebas de `e2e/agenda.spec.ts` son la regresión de (1)–(3) contra build estático. Empezaron rojas respecto al comportamiento antiguo; ahora están verdes sobre el candidato.

## G1 — Contrato temporal — pasa

| Campo | Valor |
| --- | --- |
| Estado | pasa |
| Documento | `docs/iteracion-1/contrato-temporal.md` |
| Código | `src/utils/madridTime.ts` + `.shared.mjs`, `eventSchedule.ts`, `eventFreshness.ts` |
| Tests | `madridTime.test.ts`, `eventSchedule.test.ts`, `eventFreshness.test.ts` |

Comprobado: 30/03 y 26/10 a las 10:00 Madrid; hora inexistente/ambigua; mismo ISO con `TZ=UTC` y `TZ=Europe/Madrid`; BIC martes–domingo ausente el lunes; dos pases; exclusiones `d/m/yyyy;`; `time` vacío ≠ todo el día; horizonte 90 días.

## G2 — Pipeline y frescura — pasa

| Campo | Valor |
| --- | --- |
| Estado | pasa |
| Recolección real | 2026-09-06T16:37:26.939Z, ambas fuentes municipales, `complete: true` |
| Publicación | 74 eventos (68 «próximos» por `expiresAt`); 37 altas, 36 bajas, 2041 descartes de ámbito, 72 duplicados fusionados |
| Hash | `c7e297995eea08b9c3be26d7f3cb5fab148850ade6e4ecd92d1f35b87c7e8d16` |
| Informe | `reports/event-build-report.json`, `reports/iteracion-1/2026-09-06-events-attempt.json` |

`lastCheckedAt` solo nace de fetch validado. Caché / `--offline` → `complete: false` y no se publica. Publicador transaccional con restauración si falla a mitad (`publishEvents.test.ts`). CIEA en coords oficiales `[-3.68618, 40.409435]`.

## G3 — Agenda, mapa y ficha — pasa

Filtros de categoría y público en cliente; URL `categoria`/`publico`; atrás/adelante; categoría desconocida → conjunto vacío sin romper. «Hoy» incluye sesiones del día (también finalizadas). «Próximamente» no duplica lo de hoy. Caducidad y frescura se reevalúan al volver a la pestaña y al cruzar medianoche Madrid. Mapa: capa solo planes vigentes; `?evento=` abre ficha aunque esté caducado/stale y explica el motivo. Sin JS: fechas absolutas y fecha de generación.

## G4 — Revisión editorial — pasa

Documento: `docs/iteracion-1/revision-editorial.md`. Consulta de fuentes el 6 de septiembre de 2026. Palacio de Cristal: interior cerrado, visita exterior. CEA y La Cabaña: fichas distintas. `info-centro-ambiental` pasa a `verified` con coords del CEA. Cinco fichas OSM siguen `needs-review` con incertidumbre visible.

## G5 — E2E y CI — pasa (CI remoto pendiente)

| Campo | Valor |
| --- | --- |
| Estado | pasa localmente; CI configurado, ejecución remota pendiente |
| Comando | `npm run test:e2e` → 22 passed (16,5 s) |
| Motores | Chromium + WebKit (agenda y reloj); Chromium (SW); Firefox (smoke del `dist/` real) |
| CI | `.github/workflows/validate.yml` (PR, `contents: read`); `deploy-pages.yml` añade lint + E2E |

### Matriz

| Caso | Resultado |
| --- | --- |
| Filtros | Pasa (Chromium, WebKit) |
| Cambio de día sin build | Pasa |
| Caducidad | Pasa: sale de vigentes; en Hoy queda «Finalizado» |
| Intervalo/recurrencia | Pasa: BIC abierto aunque empezó antes; exclusión solo ese día; dos pases |
| Zona | Cubierta por contrato unitario (`TZ=UTC` / `Europe/Madrid`); no emulada en cada navegador |
| Frescura | Pasa: >7 días en «Información anterior»; aviso a las 48 h |
| Datos inválidos | Zod en build; no hay refresco JSON en caliente de agenda |
| Enlaces | Pasa: ficha, `?evento=`, 404 real, `?lugar=`, `?ruta=` en smoke |
| SW activo | Pasa en Chromium (`serviceWorkers: allow`) |
| Offline | Ficha visitada en caché; no visitada no es la shell del mapa |
| Móvil 390×844 / escritorio | Pasa; filtro 44 px |
| Candidato real | Smoke Firefox: mapa, agenda, 7 fichas críticas, 5 rutas |

No se ha ejecutado GitHub Actions: no hay push autorizado.

## G6 — Cierre — pasa

Candidato en `dist/` (122 páginas, `BASE=/retiro-interactivo`, `SITE=https://tritonrules.github.io`). Build de fixtures aislado en `dist-e2e/`. Documentación de contrato, editorial, pipeline y README actualizada.

## Defectos abiertos (no bloquean el cierre técnico)

- Pendiente de campo (Iteración 3): Palacio de Cristal in situ, acceso peatonal del CEA, aseos y restauración OSM, GPS/PWA en iPhone y Android.
- Actualización A→B del SW con dos generaciones reales no se ha ensayado con dos deploys; la prueba cubre caché de ficha visitada y fallback que no es el mapa.
- Teselas OpenFreeMap: NetworkOnly; sin cartografía completa offline (intencional).
- HTML/SEO sin JavaScript no cambia «Hoy» entre visitas al mismo despliegue.

## Límites declarados

Esta etiqueta **no** significa beta lista para testers. No hay publicación remota. La Iteración 2 (experiencia de visita) no está implementada.

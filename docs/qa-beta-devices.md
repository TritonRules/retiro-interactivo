# QA beta — dispositivos reales

Beta técnica no anunciada (acceso por enlace). Repositorio público; GitHub Pages no aporta control de acceso.

**URL:** https://tritonrules.github.io/retiro-interactivo/  
**Candidato:** `40cec6b` · rama estable `beta` (+ `e095a46` solo CI)

## Decisión de datos pre-push

`npm run events:build` regeneró solo `lastCheckedAt` / timestamps de informe respecto a `40cec6b`.  
**Despliegue:** exactamente el contenido de `40cec6b` (drift local descartado; sin commit de datos nuevo).

## Matriz de pruebas

| fecha | dispositivo | sistema | navegador | versión | prueba | resultado | defecto | severidad | evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-08-06 | CI / local Chromium (Cursor) | macOS | Chromium embebido | — | Smoke local pre-push (mapa, rutas, deep links, agenda, offline) | OK tras limpiar SW | SW antiguo puede servir `/offline/` hasta unregister | media (conocida) | Fase 3 QA local |
| 2026-08-06 | — | — | — | — | Despliegue Actions → Pages | bloqueado | Actions/Pages *major outage*. Build CI OK en `31124228860` (validate/check/build/artifact). Deploy cancelado esperando runner Pages. URL HTTPS 404. | crítica (infra externa) | https://www.githubstatus.com · https://github.com/TritonRules/retiro-interactivo/actions/runs/31124228860 |
| pendiente | iPhone | iOS | Safari | — | Apertura enlace, geo concedida/denegada, Añadir a inicio, icono, mapa/rutas/agenda | pendiente | — | — | — |
| pendiente | Android | Android | Chrome | — | Instalación PWA, geo dentro/fuera Retiro, SW update, offline shell | pendiente | — | — | — |
| pendiente | Escritorio | — | Chrome/Chromium | — | Smoke HTTPS + SW | pendiente | — | — | — |
| pendiente | Escritorio | — | Firefox | — | Smoke HTTPS | pendiente | — | — | — |
| pendiente | Escritorio | — | Safari/WebKit | — | Smoke HTTPS | pendiente | — | — | — |
| pendiente | Campo | — | — | — | Validación física de rutas | pendiente | — | — | — |

## Criterio

**Clasificación actual (2026-08-06):** despliegue bloqueado — causa externa (GitHub Actions / Pages *major outage*). Código y ramas de beta ya en remoto.

**Recuperación (sin nuevas funciones):**

```bash
# Cuando https://www.githubstatus.com muestre Actions/Pages operational:
gh workflow run deploy-pages.yml --repo TritonRules/retiro-interactivo --ref beta
gh run watch --repo TritonRules/retiro-interactivo
curl -I https://tritonrules.github.io/retiro-interactivo/
```

No declarar **beta de usuarios lista** hasta completar filas móviles/reales y geo/PWA.  
Con HTTPS + smoke principal: **beta técnica publicada**.

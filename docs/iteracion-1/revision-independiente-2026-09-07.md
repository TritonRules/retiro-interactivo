# Revisión independiente del candidato — 7 de septiembre de 2026

**Dictamen: el candidato pasa las suites existentes, pero todavía no cumple el cierre técnico de la Iteración 1.** Hay dos defectos de prioridad alta, discrepancias reproducibles con el contrato temporal y cobertura obligatoria pendiente en G5.

Revisión de la rama local `codex/iteracion-1-agenda-fiable`, sobre `3d19d6a4cf6be5ff46e74cc2206ba9d6ffb31f09`, con cambios sin commit. Este documento contrasta el cierre declarado en `qa.md`; no sustituye su registro histórico. La revisión añade únicamente este informe y evidencias. No corrige el producto ni modifica sus datos.

## Qué se ha comprobado

| Comprobación ejecutada de nuevo | Resultado |
| --- | --- |
| `npm run check` | Astro y TypeScript sin errores; 103 tests Vitest, 18 archivos |
| `npm run lint` | Pasa |
| `BASE=/retiro-interactivo SITE=https://tritonrules.github.io npm run build` | 122 páginas; incluye validación de datos |
| `npm run test:e2e`, después de reconstruir el candidato | 22/22; Chromium y WebKit para agenda, Chromium para SW, Firefox para smoke |
| Datos del candidato | 38 lugares, 44 servicios, 5 rutas, 74 eventos; 68 publicados y 6 caducados |
| Coherencia de publicación | JSON fuente/público idénticos; metadatos idénticos; 74 features GeoJSON; hash correcto |
| Inspección del `dist/` servido localmente | Agenda hidratada, consulta del 6 de septiembre visible; inspección del HTML generado |

Hash del dataset: `c7e297995eea08b9c3be26d7f3cb5fab148850ade6e4ecd92d1f35b87c7e8d16`.

No se ha repetido la recolección municipal ni la verificación editorial externa. Las pruebas de fallo del pipeline usan respuestas simuladas y directorios temporales. El caso R3 usa un registro real del candidato; los casos temporales restantes usan entradas mínimas para comprobar el contrato, sin afirmar que estén presentes entre los 74 registros.

## Hallazgos de prioridad alta

### R1 · P1 · La caducidad puede tardar casi una hora en reflejarse

**Ubicación:** `src/utils/useParkClock.ts:16`; prueba relacionada: `e2e/agenda.spec.ts:73`.

El reloj programa el siguiente recálculo a una hora o a medianoche Madrid, lo que ocurra antes. No programa los límites de sesiones, caducidad ni frescura. Si se abre la página a las 11:59 y un pase termina a las 12:00, el siguiente cambio automático de estado queda a las 12:59. Un evento de foco o visibilidad lo adelanta, pero una pestaña que permanece visible no lo recibe.

La reproducción del hook real, con efectos React y temporizadores simulados, confirma cero actualizaciones al llegar a las 12:00 y el temporizador pendiente para las 12:59. No se presenta esta prueba de hook como una prueba visual de navegador.

El E2E avanza el tiempo y dispara `focus` inmediatamente. Además, comprueba la ausencia del pase en «Próximamente», aunque el pase ya estaba en «Hoy» y ausente de ese bloque. Así puede pasar sin demostrar el comportamiento exigido.

**Aceptación:** recalcular al siguiente límite temporal relevante; E2E que cruce un fin que no coincida con el temporizador periódico, sin foco, recarga ni rebuild. Verificar la retirada del plan del mapa, la actualización de la ficha abierta y la etiqueta del pase concreto en «Hoy». Probar aparte el regreso desde segundo plano.

### R2 · P1 · Un HTTP 200 con formato inválido puede publicar datos parciales como recientes

**Ubicación:** `automation/collectors/madrid-open-data-agenda.mjs:94` y `automation/normalizers/normalize-events.mjs:285`.

El collector guarda cualquier JSON recibido y acredita `complete: true` y consulta satisfactoria sin validar la estructura esperada. El normalizador interpreta la ausencia de `@graph` como una lista vacía.

**Reproducción:** una fuente devuelve un evento válido y otra `{ "error": "schema changed" }`. Ambas se consideran completas; la validación pasa y se reemplaza una publicación anterior de dos eventos por otra de uno. El guard de conjunto vacío no actúa porque queda un evento de la fuente válida. La consulta de la fuente inválida queda acreditada y su caché se sobrescribe.

**Aceptación:** validar el formato de cada respuesta antes de sustituir la caché satisfactoria o acreditar frescura. Ante una fuente obligatoria inválida, conservar la generación anterior completa, sin renovar su consulta. Probar explícitamente la combinación de fuente válida y fuente inválida con HTTP 200.

## Discrepancias del contrato temporal y de publicación

| ID / prioridad | Caso confirmado y efecto | Ubicación | Criterio de corrección |
| --- | --- | --- | --- |
| R3 · P2 | Registro real BIC `evt-50346030`, a `2026-09-06T23:30:00+02:00`: sesión con `endKnown: false`, estado `in-progress` y etiqueta «En curso». El límite hasta medianoche es retención, no un fin acreditado. | `src/utils/eventPresentation.ts:33`; `src/utils/eventSchedule.ts:245` | No afirmar actividad en curso cuando se desconoce el fin; distinguir visibilidad editorial de duración. |
| R4 · P2 | `dtstart: "2026-09-07 10:00:00"` sin `dtend` produce `expiresAt` igual al inicio. A las 11:00 desaparece de planes. Una fecha sin hora ni fin tampoco permanece en «Hoy». | `automation/normalizers/normalize-events.mjs:265` | Retención hasta el siguiente inicio de día Madrid, también en días de 23/25 horas, sin inferir duración. |
| R5 · P2 | Serie diaria con inicio `10:00+02:00` y `time` vacío: al normalizarse a UTC, la expansión toma literalmente `08:00` y genera el siguiente pase a las 08:00 Madrid. Un evento único con fecha sola y `time: "18:00"` conserva la sesión a medianoche. | `src/utils/eventSchedule.ts:93` y `:228` | Obtener la hora civil Madrid del instante y aplicar la hora explícita de sesión también cuando solo hay una. |
| R6 · P2 | Los validadores aceptan `endAt: "this is invalid"` y `startAt: "2026-02-30T10:00:00+01:00"`. El parser convierte ese 30 de febrero en 2 de marzo. El CLI también acepta fin anterior al inicio y consulta inválida. Un `dtend` ambiguo de octubre se descarta silenciosamente y el evento queda publicado. | `src/utils/validateEvents.ts:85`; `automation/validators/validate-events.mjs:65`; `src/utils/madridTime.shared.mjs:103`; `automation/normalizers/normalize-events.mjs:177` | Validar calendario, parseo, orden de límites y consulta en ambos validadores. Registrar o rechazar también errores de fin; no corregir fechas imposibles silenciosamente. |
| R7 · P2 | Periodo del 6 al 9 de septiembre sin recurrencia: el día 7 no tiene sesiones, pero `nextValidSession()` fabrica una sesión continua del 6 al 9 y permite ofrecer un plan vigente. | `src/utils/eventSchedule.ts:267` | Mantener una única interpretación de sesión; un periodo no acredita apertura diaria ni actividad continua. |
| R8 · P2 | Si antes de publicar existen los JSON y GeoJSON, pero no los nuevos metadatos, un fallo tras escribir la metadata fuente restaura los eventos A y deja metadata de B. Devuelve `keptPrevious: true` con generaciones mezcladas. | `automation/publishers/publish-events.mjs:162` | Rollback que restaure archivos previos y elimine los creados por la transacción fallida. Cubrir migración y primera publicación, además del caso con cinco archivos preexistentes. |
| R9 · P2 | Dos duplicados con el mismo ID y recurrencias martes/miércoles conservan la primera regla, sin conflicto. Si el segundo requiere revisión por un error de parseo, se copia el error pero se mantiene `published`. Los 72 duplicados actuales no presentan estas diferencias. | `automation/deduplicators/deduplicate-events.mjs:33` y `:64` | Resolver conflictos con evidencia y política explícita o marcar revisión; impedir que un error fusionado quede publicado como programación fiable. |
| R10 · P2 | `client:load` incluye la interfaz dinámica en el HTML generado. Sin JS aparecen «Hoy», filtros inoperantes y, además, el listado de `noscript`. La ficha también conserva el estado calculado al construir. | `src/pages/agenda/index.astro:31`; `src/pages/agenda/[slug].astro:48` | Fallback con fechas absolutas y fecha de generación; ningún «Hoy» ni estado vigente congelado. Verificar en navegador con JS desactivado. |

R9 se comprobó mediante invocación directa del deduplicador; los restantes casos cuentan con scripts guardados en la carpeta de evidencias. R10 se confirmó inspeccionando HTML y código/CSS, sin atribuirle una ejecución de navegador con JS desactivado.

## G5: cobertura todavía pendiente

Las siguientes son carencias de aceptación; no prueban por sí mismas que esas funciones estén rotas.

| Requisito pendiente | Evidencia del límite actual | Prueba que debe añadirse o reforzarse |
| --- | --- | --- |
| Actualización SW A→B | `e2e/sw.spec.ts:4` sirve una sola generación. `qa.md:109` reconoce la ausencia y la clasifica como no bloqueante, aunque la matriz del Prompt Maestro la exige. | Dos generaciones locales reales en el mismo origen, con SW activo, sin borrar cachés manualmente; comprobar actualización coherente. No requiere dos despliegues remotos. |
| Candidato recién construido | `e2e/prepare.mjs:24` solo reconstruye `dist` si falta `dist/index.html`. | Que el comando construya el candidato actual o verifique de forma inequívoca que el artefacto corresponde a sus entradas. En esta revisión sí se reconstruyó antes de ejecutar E2E. |
| Zona del navegador | `playwright.config.ts` no establece `timezoneId`; `qa.md:91` sustituye esa cobertura por pruebas en Node. | Ejecutar el comportamiento cliente en UTC y otra zona distinta de Madrid, conservando iguales sesiones y «Hoy». |
| Fin exacto sin interacción | `e2e/agenda.spec.ts:79` fuerza foco; falta caducidad del mapa y ficha abierta. | Caso descrito en R1, sobre el mismo build. |
| Mapa renderizado y cinco rutas cargadas | `e2e/smoke.spec.ts:6` comprueba solo el contenedor; `:24` cuenta enlaces sin abrir las cinco rutas; para `?ruta=` vuelve a comprobar el contenedor. | Abrir las cinco fichas, afirmar la selección solicitada y comprobar render/worker del mapa. Registrar los fallos externos sin confundir mocks con cartografía real. |
| Offline inequívoco y agenda antigua | `e2e/sw.spec.ts:22` acepta cualquier `h1` que no sea el del mapa. Una ficha equivocada también cumpliría la aserción. | Comprobar la ficha correcta o el fallback offline exacto, su aviso visible y la antigüedad de agenda; incluir ficha visitada y no visitada. |

El CI remoto pendiente por falta de push es una limitación correctamente declarada y permitida por el encargo. No es el motivo del rechazo de G5.

## Estado de los gates tras esta revisión

| Gate | Dictamen |
| --- | --- |
| G0 · Base y reproducción | Evidencia conservada; candidato y suites reproducidos localmente. |
| G1 · Contrato temporal | Pendiente de corregir R3–R7 y la fusión conflictiva R9. |
| G2 · Pipeline y frescura | Pendiente de corregir R2 y R8. La coherencia de los archivos actuales sí pasa. |
| G3 · Agenda, mapa y ficha | Pendiente de R1 y R10, además de reflejar las correcciones temporales. Los filtros cubiertos por la suite pasan. |
| G4 · Editorial | No se reabre por esta revisión técnica; no se ha repetido la comprobación externa de fuentes ni realizado trabajo de campo. |
| G5 · E2E y CI | Suites actuales verdes; matriz obligatoria incompleta. |
| G6 · Cierre | Pendiente de las correcciones y su revalidación; la etiqueta «cerrada técnicamente» resulta prematura. |

## Evidencias y reproducción

Carpeta: `reports/iteracion-1/2026-09-07-review/`.

Los scripts de revisión **afirman el comportamiento defectuoso observado**. Su éxito confirma la reproducción del fallo; no representa aprobación del producto. Tras corregirlo habrá que añadir regresiones que afirmen el comportamiento correcto en las suites mantenidas. Los scripts requieren ejecutarse desde la raíz, con las dependencias del proyecto instaladas.

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
node reports/iteracion-1/2026-09-07-review/reproduce-pipeline.mjs
node reports/iteracion-1/2026-09-07-review/temporal-repro.mjs
# El siguiente inspecciona también el dist real recién generado:
node reports/iteracion-1/2026-09-07-review/reproduce-ui.mjs
```

Salidas guardadas junto a los scripts. El pipeline simula fetch, usa temporales y los elimina. Las reproducciones temporales ejecutan los módulos reales; la del reloj simula React y temporizadores. Los logs `build.log` y `e2e.log` documentan la reconstrucción y los 22 E2E de esta revisión.

## Siguiente trabajo acotado

Completar una pasada correctiva de Iteración 1: primero R1/R2, después contrato y consistencia de publicación, y finalmente las pruebas pendientes de G5. Las regresiones deben fallar sobre este candidato y pasar con la corrección; repetir entonces lint, checks, datos, build real y E2E. Actualizar `qa.md` con el resultado efectivamente probado.

Se mantiene el roadmap acordado. Iteración 2 y apertura a testers siguen pendientes; las comprobaciones físicas de iPhone/Android/GPS/PWA y las cinco rutas corresponden a Iteración 3. Esta revisión no realiza commit, push, merge ni despliegue.

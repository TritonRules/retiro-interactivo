# Retiro Interactivo — visión y roadmap vigente

**Decisión de dirección: 6 de septiembre de 2026.** Este documento define el roadmap inmediato aprobado. Sustituye el alcance de Fase 1 que antes ocupaba este archivo; las actas, QA de fase e historial Git conservan la evolución anterior.

## Objetivo de producto

Una guía móvil para que las personas que visitan el Parque del Retiro puedan decidir qué hacer, encontrar servicios y seguir un paseo con información fiable. El mapa sigue siendo la pantalla principal.

La referencia de experiencia es **Puy du Fou España, Toledo**: orientación, programación, fichas visuales y planificación de la visita. Se adapta al patrimonio y naturaleza del Retiro. La comparación y sus fuentes están en la [auditoría del 6 de septiembre](auditoria-producto-2026-09-06.md).

## Base que se conserva

- Astro con salida estática, React islands, MapLibre y PWA.
- Geolocalización voluntaria; funcionamiento sin permiso de ubicación.
- Fuentes oficiales y cartografía atribuida, con revisión editorial.
- Rutas predefinidas y funcionamiento sin cuentas. Los favoritos locales se implementarán en la Iteración 2.
- Español primero; evolución posterior según uso observado.

El roadmap inmediato no requiere cambiar de stack, crear una app nativa ni añadir un backend público permanente. La búsqueda de información fiable y una experiencia de visita reconocible guía las siguientes iteraciones.

## Estado de partida

Beta técnica publicada, con 36 lugares, 44 servicios, cinco rutas y 73 registros de eventos en la fotografía auditada (`3d19d6a`, 10 de agosto de 2026). Esas cifras son históricas.

**Candidato local de Iteración 1 (6 de septiembre de 2026):** 38 lugares, 44 servicios, cinco rutas, 74 eventos, 122 páginas. Gates G0–G6 superados en local; sin push ni despliegue. Detalle en [docs/iteracion-1/qa.md](iteracion-1/qa.md).

## Roadmap inmediato aprobado

| Orden | Iteración | Alcance | Condición de salida |
| --- | --- | --- | --- |
| 1 | **Agenda e información fiables** | Filtros cliente, temporalidad dinámica, «Hoy», recurrencias, zona horaria Madrid, caducidad, antigüedad de datos, revisión de fichas críticas y E2E reales del build estático | Gates G0–G6 superados con evidencia reproducible; estado editorial explícito; sin presentar datos antiguos como actuales |
| 2 | **Experiencia de visita** | Navegación móvil inferior, búsqueda, fotografías con procedencia, información práctica, favoritos locales y «Mi visita» | Recorrido completo y usable: elegir paseo → consultar lugar → guardarlo → encontrar servicio → continuar |
| 3 | **Beta en campo** | Revalidar iPhone/Android/GPS/PWA y recorrer físicamente las cinco rutas | Pruebas físicas y correcciones cerradas **antes de abrir a testers**; canal real de feedback |

Las pruebas automáticas de navegador y las regresiones de service worker pertenecen ya a la Iteración 1. La instalación PWA, GPS y comportamiento en dispositivos físicos se revalidan en la Iteración 3. Un resultado automático satisfactorio no equivale a una validación física.

No se abren estas tres iteraciones a la vez. La Iteración 1 está **cerrada técnicamente** en el candidato local; las otras dos quedan planificadas. No se fijan nuevas fechas de publicación hasta un merge a `beta` y el despliegue correspondiente. Eso no abre testers.

## Gates de la Iteración 1

| Gate | Resultado requerido |
| --- | --- |
| G0 — Base y reproducción | Estado inicial conservado, fallos reproducidos y evidencias del build estático |
| G1 — Contrato temporal | Semántica documentada y tests de Madrid, fechas, sesiones, recurrencias, excepciones y caducidad |
| G2 — Datos y antigüedad | Pipeline coherente, fecha de consulta real, conservación ante fallo y política explícita de datos antiguos |
| G3 — Agenda en cliente | Filtros/URL y estados temporales correctos en agenda, mapa y ficha, sin reconstrucción para avanzar el reloj |
| G4 — Revisión editorial | Fichas críticas revisadas, fuentes y fechas registradas; incertidumbres tratadas sin inventar disponibilidad |
| G5 — E2E y CI | Tests versionados contra build estático, fallos reales producen código no cero, cobertura de SW y enlace profundo |
| G6 — Cierre | Evidencias completas, diferencias de datos justificadas, documentación actualizada y límites declarados |

Los gates son controles de calidad que el agente ejecutor debe verificar. No requieren una autorización humana en cada paso. Un gate fallido impide declarar completa la iteración; el trabajo independiente puede continuar mientras se corrige.

El encargo detallado se entrega en el Prompt Maestro local de Cursor para la Iteración 1, versión 0.5. Los prompts de dirección siguen la política histórica de exclusión local de Git; este roadmap es la referencia compartida del repositorio.

## Criterio para abrir a testers

La Iteración 1 cerrada habilita la Iteración 2. La Iteración 2 cerrada habilita la validación de campo. Solo después de completar la Iteración 3 se abre la prueba con usuarios prevista en el proyecto. Hasta entonces, el estado es beta técnica.

Se mantienen fuera de estas iteraciones las cuentas, comunidad, IA, monetización, navegación giro a giro y app nativa. Las decisiones futuras se apoyarán en problemas y uso observados.

## Registro de decisiones

- **2026-09-06:** dirección aprueba este orden de tres iteraciones a partir de la auditoría. Se mantiene el stack.
- **2026-09-06 (cierre técnico local):** Iteración 1 ejecutada en `codex/iteracion-1-agenda-fiable`. G0–G6 pasan en esta máquina. CI configurado; ejecución remota y publicación en Pages pendientes de autorización. No equivale a beta de usuarios.

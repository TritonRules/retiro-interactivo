# Retiro Interactivo — auditoría y dirección de producto

Fecha: **6 de septiembre de 2026**. Base examinada: rama `beta`, commit `3d19d6a`.

## 1. Diagnóstico

La app tiene una base técnica aprovechable para ser la guía de visita del Retiro: mapa, fichas, servicios, geolocalización opcional, rutas, agenda y PWA. La siguiente etapa debe convertir ese catálogo en una experiencia de visita, con información vigente y decisiones sencillas para quien está en el parque.

El estado observado es **beta técnica publicada, pendiente de preparación para usuarios**. Pasar las comprobaciones de código no resuelve los defectos de agenda encontrados en producción ni sustituye las pruebas físicas pendientes.

La referencia concreta aportada por el usuario es **Puy du Fou España, Toledo**. En los documentos históricos solo aparece la metáfora genérica de parque temático; esta auditoría la traduce por primera vez a funciones y criterios de experiencia.

Objetivo propuesto: **abrir el mapa y poder decidir qué visitar, encontrar un servicio y seguir un paseo con confianza**.

## 2. Alcance y evidencia

Se revisaron los siete documentos maestros, prompts y actas de raíz, los 19 documentos preexistentes de `docs/`, README, configuración, código, datos, informes JSON, los 17 commits y ramas disponibles, y el estado remoto de GitHub.

Se recorrió la beta HTTPS en el navegador integrado: mapa, ficha rápida de Palacio de Cristal, agenda y filtros, catálogo de rutas, detalle de ruta fotográfica y activación de sus siete paradas. Se inspeccionó en escritorio y en un viewport de **390 × 844**. Esto es prueba de navegador con tamaño móvil, no una nueva prueba en iPhone físico.

Se consultaron las tiendas oficiales de Puy du Fou España y sus imágenes promocionales. No se instaló ni se probó su app nativa; las capturas de tienda no garantizan la interfaz exacta de la última versión. Se contrastó además el cierre del Palacio de Cristal en la web del Museo Reina Sofía.

Se ejecutaron `npm run check`, `npm run lint` y `npm run build`, además de lecturas y cálculos sobre los datos. No se ejecutó la recolección/publicación de eventos ni se modificaron los datos para conservar el estado auditado. Esta entrega modifica documentación; los defectos descritos siguen pendientes de implementación.

## 3. Inventario real

| Área | Estado comprobado |
| --- | --- |
| Lugares | 36; incluyen puntos del entorno identificados como tales |
| Servicios | 44: 8 aseos, 15 fuentes, 7 zonas infantiles, 7 accesos, 3 información, 2 deporte y 2 restauración |
| Total de fichas de lugares y servicios | 80; no son 80 atracciones o lugares turísticos |
| Rutas | 5, con geometría persistida sobre caminos OSM |
| Eventos almacenados | 73, todos con última consulta del 6 de agosto |
| Eventos no caducados al 6 de septiembre | 31 según `expiresAt`; no implica comprobación actual con el organizador |
| Eventos caducados del archivo | 42; conservan `status: published`, pero la función temporal los excluye al volver a generar la web |
| Agenda publicada observada | 67 elementos en «Próximamente», antes y después de intentar filtrar por Exposiciones |
| Revisión de fichas | 6 `needs-review`; fechas de verificación de lugares/servicios del 5 de agosto |
| Información práctica de lugares | 34/36 sin `openingHoursNote`; 33/36 sin datos de accesibilidad |
| Fotografías | El catálogo y las fichas actuales no incorporan fotografías de lugares |
| Favoritos | Pendientes; estaban incluidos en el MVP original |
| Idiomas | Español; inglés previsto para crecimiento |
| Contacto | `contactUrl` vacío |

La ausencia de horarios no es incorrecta por sí sola para cada punto al aire libre; indica que el catálogo todavía no distingue suficientemente horarios de edificios, disponibilidad de servicios y acceso general al parque. `verified` documenta principalmente nombre/coordenadas contrastados, no una certificación de apertura o accesibilidad.

Los JSON de `src/data/` y `public/data/` coinciden para lugares, servicios, rutas y eventos. La desactualización principal afecta al contenido temporal y a los informes históricos, no a una divergencia entre esas copias.

Las seis fichas pendientes son Jardín de Vivaces, Aseo junto al Palacio de Cristal, Aseo al norte del Estanque, Centro de Información y Educación Ambiental, Piloto II y Euronews Café.

## 4. Historia de desarrollo y publicación

| Fecha | Referencia | Cambio y resultado |
| --- | --- | --- |
| 5 ago | `542503b` | Preparación de GitHub Pages |
| 5 ago | `87d61ce`, Fase 1 | Astro, React, MapLibre, 20 lugares, filtros y fichas |
| 5 ago | `46eaadc`, Fase 2A | 25 servicios, geolocalización voluntaria, cercanos, PWA y carga diferida de MapLibre |
| 5 ago | `6fcbce2`, Fase 2B | 36 lugares + 44 servicios, cinco rutas y pipeline de agenda municipal |
| 6 ago | `40cec6b`, Fase 3 | Correcciones de enlaces profundos, coordenadas CIEA, ruta infantil y validación; preparación beta |
| 6 ago | `e095a46` | Publicación desde rama `beta`, usando `--legacy-peer-deps` |
| 6–7 ago | `e726837`, `6066ed4`, `87ddb1a` | Incidencia de GitHub Actions/Pages documentada; después reparación del worker MapLibre, altura del mapa y carga de capas |
| 7 ago | `faa8a95`, `cd9984c`, `6ea1468` | QA HTTPS; corrección de ficha de evento oculta por el mapa; verificación de actualización PWA |
| 7–8 ago | `8eafc61`, `3edc72e` | Solapes móviles y contraste corregidos; QA automático documentado |
| 9–10 ago | `1f5863a` | Corrección de navegación a eventos interceptada por el service worker y regeneración de las cinco rutas sobre caminos peatonales |
| 10 ago | `3d19d6a` | Registro de correcciones pendientes de revalidación física en iPhone |

La rama remota `beta` sigue en `3d19d6a`. El último despliegue verificado es el [run 31394177210](https://github.com/TritonRules/retiro-interactivo/actions/runs/31394177210), con build y deploy satisfactorios el **10 de agosto**. Es posterior al candidato `1f5863a` citado en la cabecera de la matriz QA, aunque no añade cambios funcionales.

La consulta de GitHub no devuelve pull requests, issues ni releases. La evolución se conserva en commits y documentos, con ramas históricas de Fase 1, 2A, 2B y 3. No aparecen cambios remotos posteriores al 10 de agosto en la rama estable examinada.

El calendario original reservaba beta para el 14–27 de septiembre y MVP público para el 28 de septiembre–11 de octubre. Los prompts posteriores indicaban invertir el adelanto técnico en calidad. Estas fechas son intención histórica, no una nueva promesa de entrega.

## 5. Defectos y riesgos concretos

### A. Agenda: filtros inoperantes en producción — prioridad alta

Reproducción: abrir Agenda → elegir «Exposiciones» → «Filtrar». La URL cambia a `?categoria=Exposiciones&publico=`, pero permanecen **67 resultados** y el selector vuelve a «Todas».

La página lee `Astro.url.searchParams` en el frontmatter de una salida estática. GitHub Pages devuelve el HTML generado, sin ejecutar ese filtro para cada petición. Evidencia: `src/pages/agenda/index.astro:11–29`, `astro.config.mjs`.

Solución propuesta: filtros en cliente, URL sincronizada y estado vacío legible. Comprobarlos contra el build de producción servido con el mismo `BASE`, incluyendo recarga y atrás/adelante.

### B. Agenda y mapa congelan la selección temporal — prioridad alta

La selección de próximos y «Hoy» se calcula al generar la web. El mapa recibe también los eventos elegidos durante el build. A 6 de septiembre, producción todavía presenta «Pinturas desde la cripta», cuya descripción termina el 30 de agosto, como próximo evento.

Un build local actual reduce los eventos no caducados a 31. Reconstruir corrige esa selección para ese instante, pero **no actualiza las fuentes** ni garantiza que mañana desaparezcan los nuevos vencidos. El último informe de recolección es del 6 de agosto.

Solución propuesta: lectura temporal en cliente, una fecha visible de actualización, aviso de datos antiguos y un flujo operativo de recolección → revisión → publicación. El workflow actual solo ejecuta por push o manualmente y no recolecta agenda. No hay evidencia en este repositorio de una actualización diaria operativa.

### C. «Hoy», recurrencias y cambio horario — prioridad alta

`src/utils/events.ts:28–39` solo compara el día de `startAt`; las actividades de varios días dejan de aparecer en «Hoy» tras su primer día. El normalizador no conserva las reglas de recurrencia y días excluidos presentes en los datos fuente. No basta con considerar abierto todos los días cualquier intervalo entre inicio y fin.

Además, `automation/normalizers/normalize-events.mjs:94` asigna verano a todos los meses de abril a octubre. Dos casos reproducidos sin modificar datos:

| Entrada local Madrid | Resultado actual al visualizar en Madrid | Resultado esperado |
| --- | --- | --- |
| 30/03/2026 10:00 | 11:00 | 10:00 |
| 26/10/2026 10:00 | 09:00 | 10:00 |

Solución propuesta: conversión real de `Europe/Madrid`, cobertura de transiciones, sesiones/recurrencias explícitas y tratamiento de eventos de todo el día. La UI ya muestra categorías técnicas como `CuentacuentosTiteresMarionetas` y horas `0:00`; deben convertirse en etiquetas útiles.

### D. Información de visita insuficiente — prioridad alta

La ficha de Palacio de Cristal lo presenta como espacio expositivo y no recoge su cierre temporal. El [Museo Reina Sofía](https://www.museoreinasofia.es/visita/sedes-parque-retiro/) informa de que permanece cerrado por mejoras arquitectónicas y señala una instalación exterior. Esto requiere distinguir visita al entorno de acceso al interior.

Priorizar revisión editorial de los hitos y servicios esenciales, fuente oficial específica, fecha de consulta y avisos de cierre. Para el parque, el [portal turístico oficial de Madrid](https://www.esmadrid.com/informacion-turistica/parque-del-retiro) explica las restricciones por condiciones meteorológicas; conviene ofrecer acceso a la información municipal vigente. Esta auditoría no afirma que el parque esté cerrado hoy.

### E. Validación física aún pendiente — condición para beta de usuarios

El 9 de agosto un iPhone físico detectó tres fallos altos tras suites automáticas satisfactorias: fichas de eventos desde mapa/agenda y recorridos que no seguían caminos. Se corrigieron en `1f5863a`, con comprobaciones automáticas posteriores. La matriz sigue pendiente de repetir esas pruebas en el iPhone original y caminar las rutas.

También faltan evidencias finales de Android real, instalación/actualización PWA y GPS en campo, además del canal de feedback. Ver `docs/qa-beta-devices.md:62–77`. Los resultados históricos de Chromium, Firefox y WebKit emulados no equivalen a estos dispositivos físicos.

### F. Cobertura automatizada incompleta — prioridad media

`npm run check` pasa **72 tests en 13 archivos**, pero `test:e2e` es un mensaje que sale con código 0. La batería de navegador documentada se ejecutó desde `/tmp/retiro-qa`, fuera del repositorio. El CI no reproduce esa batería ni ejecuta lint.

Versionar pruebas de recorridos de usuario: agenda filtrada, caducidad sin reconstruir, fichas con SW activo, enlaces profundos, navegación histórica y rutas móviles. El fallo de filtros demuestra la necesidad de probar el artefacto estático publicado.

### G. Límites técnicos a conservar visibles

- PWA permite caché de shell/contenido, pero las teselas se configuran como `NetworkOnly`: no hay mapa completo garantizado sin conexión.
- «Lo más cercano» calcula distancias en línea recta; no son distancias de recorrido peatonal.
- Las rutas son predefinidas; no hay cálculo de trayecto desde cualquier ubicación ni navegación giro a giro.
- El paquete PWA declara un peer incompatible con la versión de Astro usada; el proyecto lo mantiene con `--legacy-peer-deps`, documentado en `docs/legacy-peer-deps.md`.
- El build sigue advirtiendo de un chunk superior a 500 kB. La carga diferida ya existe; falta medir rendimiento con red y dispositivo reales antes de decidir otra intervención.
- `MapExplorer.tsx` concentra 854 líneas. Su división es recomendable al introducir nuevos flujos, con pruebas de comportamiento; no justifica reescribir la plataforma.

## 6. Referencia Puy du Fou España y adaptación

Fuentes: [Google Play — España](https://play.google.com/store/apps/details?hl=es&id=es.puydufou.espana) y [App Store — España](https://apps.apple.com/es/app/puy-du-fou-espa%C3%B1a/id1474259491). Identificadores: `es.puydufou.espana` e iOS `1474259491`.

El desarrollador anuncia programa del día, localización y recorrido en mapa, servicios próximos y programa personalizado. Las novedades incluyen entradas digitales y pedidos. Google Play indica actualización del 20 de agosto de 2026; iOS muestra versión 9.4.1, «29 ago» sin año explícito en esa línea. No se atribuye a la app española un modo offline o un cálculo de rutas accesibles no confirmado.

Las imágenes oficiales muestran mapa ilustrado, marcadores numerados, fichas fotográficas, favoritos, horarios y navegación inferior. La adaptación visual debe usar naturaleza y patrimonio del Retiro, con una cartografía geográficamente fiable e iconos propios.

| Patrón de referencia | Retiro actual | Siguiente adaptación |
| --- | --- | --- |
| Mapa protagonista | Implementado con mapa base urbano y marcadores geométricos | Jerarquía del parque, hitos reconocibles e iconografía propia; reducir ruido visual |
| Fichas con fotografía | Texto, etiquetas y enlace | Foto con autor/licencia, historia breve y datos prácticos |
| Programa del día | Agenda técnica, antigua y con filtro roto | «Hoy» útil, sesiones reales y datos revisados |
| Programa personalizado/favoritos | Favoritos pendientes | «Mi visita» local, guardar lugares/rutas/eventos y elegir un paseo |
| Servicios próximos | Capa y lista por distancia recta | Accesos directos a aseos, agua, niños y descanso; disponibilidad verificada |
| Recorrido en mapa | Cinco itinerarios con paradas | Elegir por tiempo/intereses y progresar por las paradas; llegada real como capacidad posterior |
| Navegación inferior | Enlaces pequeños en cabecera | Mapa · Hoy · Rutas · Mi visita, accesibles con una mano |
| Entradas/pedidos | Sin equivalente general en un parque público | Enlaces oficiales de reserva cuando la actividad los requiera |

Del historial visible en iOS destacan: primera versión en agosto de 2019; rediseño de apertura del parque en 2021; modo fuera de temporada en diciembre de 2021; actualizaciones de contenido/rendimiento en 2024–2025; planificación, pedidos y entradas en las novedades actuales. Es historial público de tienda, no registro interno completo.

La propuesta conserva las decisiones originales: PWA, mapa como inicio, sin cuentas, favoritos locales, español primero y rutas predefinidas. Inglés, audio y experiencias más avanzadas pueden crecer después de comprobar el uso.

## 7. Orden de trabajo propuesto

### Iteración 1 — agenda e información fiables

1. Corregir filtro cliente, fechas, caducidad, «Hoy», sesiones y horario Madrid.
2. Mostrar fecha de revisión y un estado comprensible cuando la agenda esté antigua o vacía.
3. Revisar Palacio de Cristal y las seis fichas `needs-review`; incorporar cierres con fuente y fecha sin inferir disponibilidad.
4. Preparar el procedimiento de actualización editorial, informes y publicación comprobable.
5. Incorporar pruebas de navegador del build y quitar el falso resultado satisfactorio de `test:e2e`.

Aceptación: filtrar reduce los resultados y mantiene URL/selección; un evento vencido deja de aparecer sin necesidad de un nuevo build; los intervalos y excepciones se respetan; 10:00 sigue siendo 10:00 en las transiciones de marzo/octubre; un evento se abre correctamente con SW activo; datos antiguos se identifican.

### Iteración 2 — experiencia de visita inspirada en la referencia

1. Mantener el mapa de entrada e introducir navegación inferior en móvil.
2. Añadir búsqueda de lugares y accesos claros a servicios.
3. Crear fichas visuales con fotografía, duración orientativa, fuente y estado de acceso.
4. Implementar favoritos locales y una primera «Mi visita» basada en las cinco rutas existentes.
5. Adaptar el panel de ruta para que el visitante vea el mapa y su siguiente parada con facilidad.

Recorrido de aceptación: **elegir «tengo una hora» → ver la ruta → abrir una parada → guardarla → consultar un aseo o fuente → continuar el paseo**. Debe funcionar también sin conceder ubicación; al activarla, explicar con precisión qué representa la distancia.

### Iteración 3 — beta en el parque

1. Revalidar iPhone y Android físicos, GPS, PWA, actualización y situaciones sin conexión.
2. Recorrer los cinco itinerarios y corregir accesos, obstáculos y duración observada.
3. Habilitar un canal real de feedback y retirar texto técnico de la interfaz pública.
4. Probar con el grupo de 20 testers previsto, registrando dificultades y resolución.
5. Decidir publicación amplia a partir de evidencia de uso, información vigente y defectos altos resueltos.

No se necesita cambiar de stack ni pasar a app nativa para ejecutar estas iteraciones. Un mapa ilustrado propio puede desarrollarse gradualmente sobre la cartografía existente; primero hay que comprobar que el diseño mejora orientación y comprensión.

## 8. Documentos e informes: qué representa cada uno

Los documentos de fase deben conservarse como historia. Este informe describe la fotografía actual y propone prioridades; las iteraciones futuras deberán registrar qué se implementó y qué se verificó.

| Fuente | Utilidad y vigencia |
| --- | --- |
| `Documento_Maestro_Proyecto_Retiro_v0.1.md` | Visión, MVP, privacidad y calendario original; favoritos incluidos |
| `Prompt_Maestro_Desarrollo_Retiro_v0.1.md` | Alcance inicial, mapa dominante y primeras convenciones visuales |
| `Acta_Cierre_Fase_1_Retiro_v0.2.md` | Cierre histórico del primer prototipo |
| `Prompt_Maestro_Fase_2A_Retiro_v0.2.md` | Plan PWA, geo, servicios y criterio de invertir el adelanto en calidad |
| `Acta_Cierre_Fase_2A_Retiro_v0.3.md` | Cierre histórico de 2A |
| `Prompt_Maestro_Fase_2B_Retiro_v0.3.md` | Ampliación a 60–100 fichas totales, rutas y agenda |
| `Prompt_Maestro_Despliegue_Beta_Retiro_v0.4.md` | Procedimiento de preparación/publicación; exclusión deliberada de maestros locales |
| `README.md` | Entrada técnica; cabecera actualizada con esta auditoría |
| `docs/master-product.md` | Visión resumida de Fase 1; no usar como inventario actual |
| `docs/implementation-log.md` | Registro hasta el 6 de agosto; el histórico completo requiere Git |
| `docs/content-model.md`, `docs/data-sources.md` | Modelo, procedencia y atribución; lectura junto al código actual |
| `docs/poi-review.md` | Revisión documental de los 20 lugares iniciales; no de todo el catálogo vigente |
| `docs/routes.md`, `docs/routes-validation.md` | Modelo y comprobación de rutas; contrastar con geometrías corregidas en agosto |
| `docs/event-pipeline.md`, `docs/event-editorial-policy.md`, `docs/event-editorial-review.md` | Flujo editorial y revisión inicial; no evidencia de una recolección diaria actual |
| `docs/qa-phase-2a.md`, `docs/qa-phase-2b.md`, `docs/qa-phase-3.md` | Resultados de cada fase; no reemplazan QA posterior |
| `docs/qa-beta-devices.md` | Registro QA más reciente, hasta el 10 de agosto; revalidación física pendiente |
| `docs/beta-readiness.md` | Evaluación del 6 de agosto, anterior al despliegue y correcciones posteriores |
| `docs/beta-deploy-checklist.md` | Conserva texto «sin publicar aún», ya superado por la publicación |
| `docs/pwa-testing.md`, `docs/performance.md`, `docs/legacy-peer-deps.md` | Decisiones y límites PWA, rendimiento y dependencias; no mediciones actuales de campo |
| `reports/content-import-report.json` | Generado 5 de agosto: totales aún válidos; distancias de rutas anteriores a su corrección |
| `reports/event-build-report.json`, `public/data/event-build-report.json` | Ejecución del 6 de agosto: 73 publicados/próximos en ese momento; no contador actual |

Ejemplo de discrepancia del informe de contenido: «imprescindible» figura con **1.590 m**, frente a **2.070 m** en el catálogo actual; ruta fotográfica con **1.415 m**, frente a **2.330 m**. Los cinco recorridos actuales son 2.070, 1.450, 2.570, 2.330 y 4.170 m. No deben regenerarse informes históricos y presentarlos como si fueran la evidencia de agosto; crear una nueva revisión con fecha.

Los siete maestros, prompts y actas de raíz están excluidos de Git mediante `.git/info/exclude` (`Prompt_*`, `Acta_*`, `Documento_*`, `*.docx`). Es una decisión documentada del despliegue, no una pérdida accidental. Su contenido local se ha considerado aquí, pero no tiene historial en el remoto; cualquier respaldo futuro debe respetar esa decisión de publicación.

## 9. Resultado de validación de esta revisión

| Comprobación | Resultado del 6 de septiembre |
| --- | --- |
| Árbol de trabajo antes de documentar | Limpio, rama `beta` |
| Astro check + TypeScript | Sin errores, advertencias ni hints; 44 archivos revisados por Astro |
| Vitest | 72/72 tests, 13/13 archivos |
| ESLint | Correcto |
| Build estático | Correcto, 119 páginas; aviso conocido de chunk >500 kB |
| Validación de datos incluida en build | 36 lugares + 44 servicios + 5 rutas + 73 eventos, 31 no caducados |
| Mapa publicado | Basemap, marcadores y ficha rápida visibles en escritorio y viewport móvil |
| Ruta fotográfica | Ficha y enlace a mapa funcionan; siete paradas y trazado cargados |
| Agenda publicada | Filtro roto reproducido; actividades vencidas visibles |
| Errores de consola del recorrido inspeccionado | No registrados por el navegador integrado |
| GPS, PWA en dispositivo y rutas en campo | No revalidados en esta sesión; mantener pendientes históricos |

La conclusión técnica es que la base se puede evolucionar. La conclusión de producto es que la siguiente inversión debe cerrar agenda e información práctica y después hacer reconocible la experiencia de visita descrita, con criterios verificables.

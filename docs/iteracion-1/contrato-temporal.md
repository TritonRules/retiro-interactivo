# Contrato temporal — Iteración 1

Zona de negocio: **Europe/Madrid**. Las funciones de dominio reciben `now` (instante UTC). Ni el build ni el navegador del visitante definen «hoy».

## Instante, fecha, intervalo y sesión

| Concepto | Significado |
| --- | --- |
| Instante | ISO con offset. Se respeta tal cual. |
| Fecha local sin hora | Día civil Madrid. No es una visita a las 00:00. |
| Intervalo interno | `[inicio, fin)`: el inicio entra, el fin no. |
| Sesión | Ocurrencia visitable: un pase concreto o una apertura de un día de serie. |

`endAt` es el fin declarado por la fuente (aún puede ser inclusivo en origen). `expiresAt` es el instante exclusivo de caducidad editorial. Si la fuente omite el fin, la retención es el **siguiente inicio de día Madrid**, calculado por calendario (no `+24h`). Esa retención no afirma que la actividad esté en curso hasta medianoche.

Los límites de día se obtienen con `00:00` Madrid del día y del día siguiente. En el cambio de octubre ese intervalo dura 25 h; en el de marzo, 23 h.

## Interpretación de la fuente

- Con offset explícito: usar el instante.
- Fecha/hora sin offset: IANA `Europe/Madrid`. Nunca un offset por mes ni `Date` del proceso.
- `2026-03-29 02:30` no existe; `2026-10-25 02:30` es ambigua. Sin offset que desambigüe → `needs-review` y el motivo. No se elige en silencio.
- `dtend` de una serie limita el periodo, no la duración de cada pase.
- `time` vacío y `dtstart` a medianoche **no** demuestran «todo el día». Precisión: `unknown`.
- «Todo el día» solo con evidencia explícita (`allDay` o equivalente).
- Listas `excluded-days` municipales: `d/m/yyyy;` (día/mes/año). No se usa `Date.parse` del navegador.

El JSON de Madrid Open Data usa `recurrence.days` con códigos `MO…SU`, `frequency` (`WEEKLY` observado) e `interval`. También aparecen códigos castellanos `L,M,X,J,V,S,D` en el esquema CSV; ambos se aceptan. Una frecuencia no soportada no genera sesiones.

## «Hoy», vigentes y caducados

- **Hoy:** sesiones que intersectan el día civil Madrid, incluidas las ya terminadas (etiqueta «Finalizado»). No entran canceladas, aplazadas, `draft`, `needs-review` ni datos stale/desconocidos.
- Un día excluido o un lunes de una serie martes–domingo no cuenta como apertura.
- **Plan vigente / próximos / mapa:** publicados, no caducados, con frescura `fresh` o `aging`, y con una sesión cuya ventana aún no ha terminado. Orden: próxima sesión válida, no el primer día histórico.
- Caducidad y cancelación se aplican aunque la copia sea reciente.
- Fuera del horizonte de 90 días no se concluye que no hay actividades: se indica falta de cobertura.

## Frescura

Por fuente y por evento. Una fuente reciente no «blanquea» otra antigua.

| Edad desde consulta satisfactoria | Presentación |
| --- | --- |
| ≤ 48 h | Programación visible. «Última consulta: …». No promete confirmación del organizador. |
| > 48 h y ≤ 7 días | Aviso de que necesita actualizarse. Enlaces oficiales. |
| > 7 días o desconocida | No es plan vigente. Puede listarse aparte como información anterior. |

`lastCheckedAt` solo nace de un fetch validado. Caché, `--offline`, rebuild o un informe no rejuvenece. Una marca futura incoherente (más de 5 minutos) se trata como desconocida. Una respuesta «sin cambios» sí acredita consulta nueva.

## Deduplicación

Identidad de serie: `sourceEventId` municipal. Fusión entre datasets: una ficha, unión de exclusiones, se conserva la regla más completa. Un segundo pase el mismo día a otra hora no se borra: el fingerprint incluye la hora, no solo el día.

## Sin JavaScript

El HTML estático muestra fechas absolutas y la fecha de generación. No presenta un «Hoy» congelado como si fuera actual.

Una categoría desconocida en la URL no rompe la página: el conjunto filtrado queda vacío y se puede quitar el filtro.

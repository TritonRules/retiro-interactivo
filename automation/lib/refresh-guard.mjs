/**
 * Guardia de la actualización automática de agenda.
 * Compara el conjunto recién publicado con el anterior y decide si es seguro
 * confirmarlo (commit + despliegue). No escribe nada: solo evalúa.
 */

/** Umbrales documentados en docs/event-pipeline.md («Actualización automática»). */
export const REFRESH_GUARD = {
  /** Caída máxima tolerada de eventos próximos frente al conjunto anterior (0.6 = 60 %). */
  maxUpcomingDrop: 0.6,
  /** Por debajo de este número de próximos previos no se aplica el porcentaje (ruido natural). */
  minPreviousForRatio: 10,
};

function isUpcoming(event, nowMs) {
  if (event?.status !== 'published') return false;
  const expires = Date.parse(event.expiresAt);
  return Number.isNaN(expires) ? false : expires >= nowMs;
}

export function countUpcoming(events, nowMs) {
  return Array.isArray(events) ? events.filter((event) => isUpcoming(event, nowMs)).length : 0;
}

/**
 * @param {object} input
 * @param {unknown[]} input.previous eventos publicados antes de la ejecución
 * @param {unknown[]} input.next eventos publicados tras la ejecución
 * @param {object} input.report informe de events:build (reports/event-build-report.json)
 * @param {number} input.nowMs instante de referencia (normalmente report.ranAt)
 */
export function evaluateRefresh({ previous, next, report, nowMs, thresholds = REFRESH_GUARD }) {
  const reasons = [];
  if (!report || report.published !== true) {
    reasons.push(`events:build no publicó (${report?.steps?.publish ?? 'sin informe'}).`);
  }
  if (report && report.collectComplete !== true) {
    reasons.push('La recolección no fue completa en todas las fuentes.');
  }
  const previousTotal = Array.isArray(previous) ? previous.length : 0;
  const nextTotal = Array.isArray(next) ? next.length : 0;
  // Los previos se evalúan en el mismo instante: lo que ya caducó no cuenta como pérdida.
  const previousUpcoming = countUpcoming(previous, nowMs);
  const nextUpcoming = countUpcoming(next, nowMs);

  if (nextTotal === 0 || nextUpcoming === 0) {
    reasons.push('El conjunto nuevo no tiene eventos próximos (0).');
  } else if (previousUpcoming >= thresholds.minPreviousForRatio) {
    const drop = 1 - nextUpcoming / previousUpcoming;
    if (drop > thresholds.maxUpcomingDrop) {
      reasons.push(
        `Caída sospechosa de eventos próximos: ${previousUpcoming} → ${nextUpcoming} (−${Math.round(drop * 100)} %, máximo ${Math.round(thresholds.maxUpcomingDrop * 100)} %).`,
      );
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
    previousTotal,
    nextTotal,
    previousUpcoming,
    nextUpcoming,
  };
}

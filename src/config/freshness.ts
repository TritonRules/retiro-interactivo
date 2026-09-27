/** Umbrales de antigüedad de agenda. Centralizados para pipeline, UI y tests. */
export const FRESHNESS = {
  /** Hasta este inclusive: programación disponible, sin prometer confirmación del organizador. */
  freshMaxMs: 48 * 60 * 60 * 1000,
  /** Hasta este inclusive, pasado freshMaxMs: aviso de actualización. */
  agingMaxMs: 7 * 24 * 60 * 60 * 1000,
  /** Desfase máximo aceptado si la marca de consulta es ligeramente futura. */
  clockSkewMs: 5 * 60 * 1000,
  /** Días civiles Madrid hacia adelante para evaluar recurrencias. */
  expansionHorizonDays: 90,
} as const;

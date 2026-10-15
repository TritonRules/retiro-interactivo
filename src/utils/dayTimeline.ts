import type { ParkEvent } from '../types/event';
import { eventFreshness } from './eventFreshness';
import { eventTimePrecision, sessionsOnMadridDay } from './eventSchedule';
import { addMadridDays, madridDayKey } from './madridTime';

/**
 * «Hoy en el Retiro»: programa del día en reloj de Madrid.
 *
 * Rendimiento: las sesiones del día se calculan una sola vez por día
 * (`buildDayPlan`) y el estado ahora/pasado/en curso se deriva después con
 * simples comparaciones numéricas (`classifyPlan`), sin crear `Intl` por evento.
 */

/** Duración mostrada cuando la fuente no publica hora de fin. */
export const NOMINAL_DURATION_MS = 60 * 60 * 1000;
/** Sesiones más largas que esto van a la fila compacta «Todo el día». */
export const LONG_SESSION_MS = 6 * 60 * 60 * 1000;
/** Desde esta hora de Madrid se propone «Mañana». */
export const EVENING_SWITCH_HOUR = 20;

export type TimelineState = 'past' | 'ongoing' | 'upcoming';

export interface TimelineItem {
  key: string;
  eventId: string;
  slug: string;
  title: string;
  venue: string;
  category: string;
  hasCoordinates: boolean;
  startMs: number;
  /** Fin para mostrar (nominal si `endKnown` es false). */
  endMs: number;
  endKnown: boolean;
  allDay: boolean;
  /** Carril horizontal para sesiones solapadas. */
  lane: number;
  /** Carriles del grupo de solapes al que pertenece (ancho de la barra). */
  groupLanes: number;
}

export interface DayPlan {
  dayKey: string;
  timed: TimelineItem[];
  allDay: TimelineItem[];
  lanes: number;
  /** Inicio y fin del eje en horas completas (ms). */
  axisStartMs: number;
  axisEndMs: number;
}

const HOUR_MS = 60 * 60 * 1000;
/** Altura mínima de barra (tocable) expresada en tiempo, para no solapar carriles. */
export const MIN_DISPLAY_MS = 60 * 60 * 1000;

function isListable(event: ParkEvent, nowMs: number): boolean {
  if (
    event.status === 'cancelled' ||
    event.status === 'postponed' ||
    event.status === 'draft' ||
    event.status === 'needs-review'
  ) {
    return false;
  }
  const band = eventFreshness(event, nowMs);
  return band !== 'stale' && band !== 'unknown';
}

/** Calcula una vez las sesiones de un día civil de Madrid. */
export function buildDayPlan(events: ParkEvent[], dayKey: string, nowMs: number): DayPlan {
  const timed: TimelineItem[] = [];
  const allDay: TimelineItem[] = [];
  for (const event of events) {
    if (!isListable(event, nowMs)) continue;
    const precision = eventTimePrecision(event);
    for (const session of sessionsOnMadridDay(event, dayKey)) {
      if (session.cancelled) continue;
      const span = session.endMs - session.startMs;
      const isAllDay = precision !== 'exact' || (session.endKnown && span >= LONG_SESSION_MS);
      const item: TimelineItem = {
        key: `${event.id}@${session.startMs}`,
        eventId: event.id,
        slug: event.slug,
        title: event.title,
        venue: event.venue,
        category: event.category,
        hasCoordinates: Boolean(event.coordinates),
        startMs: session.startMs,
        endMs: session.endKnown || isAllDay ? session.endMs : session.startMs + NOMINAL_DURATION_MS,
        endKnown: session.endKnown,
        allDay: isAllDay,
        lane: 0,
        groupLanes: 1,
      };
      (isAllDay ? allDay : timed).push(item);
    }
  }
  timed.sort((a, b) => a.startMs - b.startMs || a.title.localeCompare(b.title, 'es'));
  allDay.sort((a, b) => a.title.localeCompare(b.title, 'es'));

  // Carriles: primer carril libre (greedy) para sesiones solapadas.
  const laneEnds: number[] = [];
  let group: TimelineItem[] = [];
  let groupEnd = -Infinity;
  const closeGroup = () => {
    const lanes = group.reduce((max, i) => Math.max(max, i.lane + 1), 1);
    for (const i of group) i.groupLanes = lanes;
    group = [];
  };
  for (const item of timed) {
    if (item.startMs >= groupEnd) {
      closeGroup();
      laneEnds.fill(0);
      groupEnd = -Infinity;
    }
    let lane = laneEnds.findIndex((end) => end <= item.startMs);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = Math.max(item.endMs, item.startMs + MIN_DISPLAY_MS);
    item.lane = lane;
    group.push(item);
    groupEnd = Math.max(groupEnd, laneEnds[lane]!);
  }
  closeGroup();

  let axisStartMs = 0;
  let axisEndMs = 0;
  if (timed.length > 0) {
    const first = timed[0]!.startMs;
    const last = Math.max(...timed.map((item) => item.endMs));
    axisStartMs = Math.floor(first / HOUR_MS) * HOUR_MS;
    axisEndMs = Math.ceil(last / HOUR_MS) * HOUR_MS;
  }
  return {
    dayKey,
    timed,
    allDay,
    lanes: Math.max(1, ...timed.map((i) => i.groupLanes)),
    axisStartMs,
    axisEndMs,
  };
}

export function itemState(item: TimelineItem, nowMs: number): TimelineState {
  if (nowMs >= item.endMs) return 'past';
  if (nowMs >= item.startMs) return 'ongoing';
  return 'upcoming';
}

export interface PlanCounts {
  past: number;
  ongoing: number;
  upcoming: number;
  total: number;
}

export function countPlan(plan: DayPlan, nowMs: number): PlanCounts {
  const counts: PlanCounts = { past: 0, ongoing: 0, upcoming: 0, total: 0 };
  for (const item of [...plan.timed, ...plan.allDay]) {
    counts[itemState(item, nowMs)] += 1;
    counts.total += 1;
  }
  return counts;
}

const hourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Madrid',
  hour: '2-digit',
  hourCycle: 'h23',
});

/** Hora (0-23) en Madrid, independiente de la zona del dispositivo. */
export function madridHour(nowMs: number): number {
  return Number(hourFormatter.format(new Date(nowMs)));
}

export type TimelineDay = 'hoy' | 'manana';

/** Hoy y mañana en reloj de Madrid. */
export function timelineDayKeys(nowMs: number): { hoy: string; manana: string } {
  const hoy = madridDayKey(nowMs);
  return { hoy, manana: addMadridDays(hoy, 1) };
}

/**
 * Día que se muestra por defecto: «Mañana» desde las 20:00 de Madrid o cuando
 * ya no queda nada por empezar ni en curso hoy.
 */
export function defaultTimelineDay(todayPlan: DayPlan, nowMs: number): TimelineDay {
  if (madridHour(nowMs) >= EVENING_SWITCH_HOUR) return 'manana';
  const counts = countPlan(todayPlan, nowMs);
  if (counts.total > 0 && counts.ongoing + counts.upcoming === 0) return 'manana';
  return 'hoy';
}

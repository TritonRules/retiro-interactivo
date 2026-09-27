import { FRESHNESS } from '../config/freshness';
import type { ParkEvent } from '../types/event';
import {
  compareByNextSession,
  isExpiredAt,
  nextValidSession,
  sessionsOnMadridDay,
} from './eventSchedule';
import { madridDayKey } from './madridTime';

export type FreshnessBand = 'fresh' | 'aging' | 'stale' | 'unknown';

export function freshnessBand(lastCheckedAt: string | undefined, nowMs: number): FreshnessBand {
  if (!lastCheckedAt) return 'unknown';
  const checked = Date.parse(lastCheckedAt);
  if (Number.isNaN(checked)) return 'unknown';
  if (checked > nowMs + FRESHNESS.clockSkewMs) return 'unknown';
  const age = nowMs - checked;
  if (age <= FRESHNESS.freshMaxMs) return 'fresh';
  if (age <= FRESHNESS.agingMaxMs) return 'aging';
  return 'stale';
}

export function eventFreshness(event: ParkEvent, nowMs: number): FreshnessBand {
  return freshnessBand(event.lastCheckedAt, nowMs);
}

export function isUsableAsCurrentPlan(event: ParkEvent, nowMs: number): boolean {
  if (event.status !== 'published') return false;
  if (isExpiredAt(event, nowMs)) return false;
  const band = eventFreshness(event, nowMs);
  if (band === 'stale' || band === 'unknown') return false;
  return nextValidSession(event, nowMs) != null;
}

export function selectCurrentPlans(events: ParkEvent[], nowMs: number): ParkEvent[] {
  return events
    .filter((event) => isUsableAsCurrentPlan(event, nowMs))
    .sort((a, b) => compareByNextSession(a, b, nowMs));
}

export function selectTodayEvents(events: ParkEvent[], nowMs: number): ParkEvent[] {
  const today = madridDayKey(nowMs);
  return events
    .filter((event) => {
      if (
        event.status === 'cancelled' ||
        event.status === 'postponed' ||
        event.status === 'draft' ||
        event.status === 'needs-review'
      ) {
        return false;
      }
      const band = eventFreshness(event, nowMs);
      if (band === 'stale' || band === 'unknown') return false;
      return sessionsOnMadridDay(event, today).length > 0;
    })
    .sort((a, b) => compareByNextSession(a, b, nowMs));
}

export function selectStaleButDated(events: ParkEvent[], nowMs: number): ParkEvent[] {
  return events
    .filter((event) => event.status === 'published')
    .filter((event) => !isExpiredAt(event, nowMs))
    .filter((event) => {
      const band = eventFreshness(event, nowMs);
      return band === 'stale' || band === 'unknown';
    })
    .filter((event) => nextValidSession(event, nowMs) != null)
    .sort((a, b) => compareByNextSession(a, b, nowMs));
}

export function freshnessCopy(band: FreshnessBand, lastCheckedAt: string | undefined): string {
  if (band === 'fresh' && lastCheckedAt) {
    const when = new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(lastCheckedAt));
    return `Última consulta: ${when}`;
  }
  if (band === 'aging') {
    return 'La agenda necesita actualizarse. Consulta la fuente oficial.';
  }
  if (band === 'stale' || band === 'unknown') {
    return 'Actualización pendiente. Esta información no se muestra como plan vigente.';
  }
  return 'Consulta la fuente oficial para confirmar horarios.';
}

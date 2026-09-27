import type { ParkEvent } from '../types/event';
import { eventTimePrecision, type EventSession } from './eventSchedule';
import { formatMadridDateTime, formatMadridTime } from './madridTime';

export function formatSessionWhen(
  session: EventSession,
  precision: ReturnType<typeof eventTimePrecision>,
): string {
  const iso = new Date(session.startMs).toISOString();
  if (precision === 'allDay' || precision === 'unknown') {
    const day = formatMadridDateTime(iso, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return precision === 'unknown' ? `${day} · hora no confirmada` : day;
  }
  return formatMadridDateTime(iso, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

export function sessionBadge(
  state: 'upcoming' | 'in-progress' | 'ended',
  precision: ReturnType<typeof eventTimePrecision>,
): string | null {
  if (state === 'ended') return 'Finalizado';
  if (state === 'in-progress' && precision === 'exact') return 'En curso';
  if (state === 'in-progress' && precision === 'unknown') return 'Previsto hoy';
  return null;
}

export function eventWhenLabel(event: ParkEvent, session: EventSession | null): string {
  const precision = eventTimePrecision(event);
  if (!session) {
    if (precision === 'exact') {
      return formatMadridDateTime(event.startAt, { dateStyle: 'medium', timeStyle: 'short' });
    }
    return formatMadridDateTime(event.startAt, { dateStyle: 'medium' });
  }
  const iso = new Date(session.startMs).toISOString();
  const day = formatMadridDateTime(iso, { dateStyle: 'medium' });
  if (precision === 'unknown') return `${day} · hora no confirmada`;
  if (precision === 'allDay') return `${day} · todo el día`;
  return `${day} · ${formatMadridTime(iso)}`;
}

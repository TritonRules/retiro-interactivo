import { useParkClock } from '../../utils/useParkClock';
import type { ParkEvent } from '../../types/event';
import { eventFreshness, freshnessCopy, isUsableAsCurrentPlan } from '../../utils/eventFreshness';
import { eventTimePrecision, isExpiredAt, nextValidSession, todaysSessions } from '../../utils/eventSchedule';
import { eventWhenLabel, sessionBadge } from '../../utils/eventPresentation';
import { formatMadridDateTime } from '../../utils/datetime';

interface Props {
  event: ParkEvent;
}

export default function EventLiveStatus({ event }: Props) {
  const now = useParkClock();
  const expired = isExpiredAt(event, now) || event.status === 'expired';
  const band = eventFreshness(event, now);
  const usable = isUsableAsCurrentPlan(event, now);
  const next = nextValidSession(event, now);
  const today = todaysSessions(event, now);
  const precision = eventTimePrecision(event);

  return (
    <div className="event-live" data-status={event.status} data-freshness={band}>
      {event.status === 'cancelled' ? (
        <p className="badge">Actividad cancelada</p>
      ) : null}
      {event.status === 'postponed' ? (
        <p className="badge">Actividad aplazada</p>
      ) : null}
      {expired ? <p className="badge">Evento caducado o fuera de agenda principal</p> : null}
      {!usable && !expired ? (
        <p className="badge">{freshnessCopy(band, event.lastCheckedAt)}</p>
      ) : null}
      <p className="meta">
        {eventWhenLabel(event, next)}
        {precision === 'unknown' ? ' · No se ha confirmado la hora de visita' : ''}
      </p>
      {today.length > 0 ? (
        <ul>
          {today.map(({ session, state }) => (
            <li key={session.startMs}>
              {sessionBadge(state, precision) ? `${sessionBadge(state, precision)} · ` : ''}
              {precision === 'exact'
                ? formatMadridDateTime(new Date(session.startMs).toISOString(), {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })
                : formatMadridDateTime(new Date(session.startMs).toISOString(), {
                    dateStyle: 'full',
                  })}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

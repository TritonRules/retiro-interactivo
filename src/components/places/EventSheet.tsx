import type { MapEventPoint } from '../../types/event';
import { eventFreshness, freshnessCopy } from '../../utils/eventFreshness';
import { eventTimePrecision, isExpiredAt, nextValidSession } from '../../utils/eventSchedule';
import { eventWhenLabel } from '../../utils/eventPresentation';
import { formatMadridDateTime } from '../../utils/datetime';
import { useParkClock } from '../../utils/useParkClock';
import type { ParkEvent } from '../../types/event';

interface Props {
  event: MapEventPoint;
  eventHref: string;
  onClose: () => void;
  variant: 'mobile' | 'desktop';
}

function asEvent(event: MapEventPoint): ParkEvent {
  return {
    shortDescription: event.title,
    sourceName: 'Agenda',
    sourceTier: 'A',
    confidence: 1,
    ...event,
  };
}

export function EventSheet({ event, eventHref, onClose, variant }: Props) {
  const now = useParkClock();
  const full = asEvent(event);
  const expired = isExpiredAt(full, now) || event.status === 'expired';
  const cancelled = event.status === 'cancelled';
  const band = eventFreshness(full, now);
  const next = nextValidSession(full, now);
  const precision = eventTimePrecision(full);
  const notPlan =
    cancelled || expired || band === 'stale' || band === 'unknown' || event.status !== 'published';

  return (
    <aside
      className={`ficha ficha--${variant}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="ficha-evento-titulo"
    >
      <div className="ficha__header">
        <div>
          <h2 id="ficha-evento-titulo" className="ficha__title">
            {event.title}
          </h2>
        </div>
        <button
          type="button"
          className="ficha__close"
          onClick={onClose}
          aria-label="Cerrar ficha del evento"
        >
          ×
        </button>
      </div>
      {cancelled ? <p className="ficha__desc">Esta actividad está cancelada.</p> : null}
      {expired ? (
        <p className="ficha__desc">Esta actividad ya no forma parte de la programación vigente.</p>
      ) : null}
      {band === 'stale' || band === 'unknown' ? (
        <p className="ficha__desc">{freshnessCopy(band, event.lastCheckedAt)}</p>
      ) : null}
      <p className="ficha__desc">
        {notPlan && !next
          ? precision === 'exact'
            ? formatMadridDateTime(event.startAt, { dateStyle: 'medium', timeStyle: 'short' })
            : formatMadridDateTime(event.startAt, { dateStyle: 'medium' })
          : eventWhenLabel(full, next)}
      </p>
      <p className="ficha__desc">{event.venue}</p>
      <p className="ficha__desc">
        <a href={event.sourceUrl} rel="noopener noreferrer" target="_blank">
          Fuente oficial
        </a>
      </p>
      <div className="ficha__actions">
        <a className="btn btn--primary" href={eventHref}>
          Ver ficha
        </a>
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </aside>
  );
}

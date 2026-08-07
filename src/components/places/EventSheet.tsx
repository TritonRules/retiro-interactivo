import type { MapEventPoint } from '../../types/event';
import { formatMadridDateTime } from '../../utils/datetime';

interface Props {
  event: MapEventPoint;
  eventHref: string;
  onClose: () => void;
  variant: 'mobile' | 'desktop';
}

export function EventSheet({ event, eventHref, onClose, variant }: Props) {
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
      <p className="ficha__desc">{formatMadridDateTime(event.startAt)}</p>
      <p className="ficha__desc">{event.venue}</p>
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

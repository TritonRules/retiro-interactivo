import type { MapEventPoint, ParkEvent } from '../../types/event';
import { nextValidSession } from '../../utils/eventSchedule';
import { eventWhenLabel } from '../../utils/eventPresentation';
import { useParkClock } from '../../utils/useParkClock';

interface Props {
  events: MapEventPoint[];
  venue: string;
  onSelect: (eventId: string) => void;
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

/** Lista de los eventos agrupados en un mismo marcador (misma sede). */
export function EventGroupSheet({ events, venue, onSelect, onClose, variant }: Props) {
  const now = useParkClock();
  return (
    <aside
      className={`ficha ficha--${variant}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="ficha-grupo-eventos-titulo"
    >
      <div className="ficha__header">
        <div>
          <h2 id="ficha-grupo-eventos-titulo" className="ficha__title">
            {events.length} eventos aquí
          </h2>
          <p className="ficha__desc">{venue}</p>
        </div>
        <button
          type="button"
          className="ficha__close"
          onClick={onClose}
          aria-label="Cerrar lista de eventos"
        >
          ×
        </button>
      </div>
      <ul className="ficha__list">
        {events.map((event) => {
          const full = asEvent(event);
          return (
            <li key={event.id}>
              <button
                type="button"
                className="ficha__list-item"
                onClick={() => onSelect(event.id)}
              >
                <span className="ficha__list-title">{event.title}</span>
                <span className="ficha__list-meta">
                  {eventWhenLabel(full, nextValidSession(full, now))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

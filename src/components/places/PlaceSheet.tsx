import type { Place } from '../../types/place';
import { getCategoryLabel } from '../../utils/categories';

interface Props {
  place: Place;
  placeHref: string;
  onClose: () => void;
  variant: 'mobile' | 'desktop';
}

export function PlaceSheet({ place, placeHref, onClose, variant }: Props) {
  return (
    <aside
      className={`ficha ficha--${variant}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="ficha-titulo"
    >
      <div className="ficha__header">
        <div>
          <span className="badge">{getCategoryLabel(place.category)}</span>
          {place.status === 'needs-review' ? (
            <span className="status-pill" style={{ marginLeft: '0.5rem' }}>
              Pendiente de revisión
            </span>
          ) : null}
          <h2 id="ficha-titulo" className="ficha__title">
            {place.name}
          </h2>
        </div>
        <button
          type="button"
          className="ficha__close"
          onClick={onClose}
          aria-label="Cerrar ficha del lugar"
        >
          ×
        </button>
      </div>
      <p className="ficha__desc">{place.shortDescription}</p>
      <ul className="ficha__tags" aria-label="Etiquetas">
        {place.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
      <div className="ficha__actions">
        <a className="btn btn--primary" href={placeHref}>
          Ver lugar
        </a>
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </aside>
  );
}

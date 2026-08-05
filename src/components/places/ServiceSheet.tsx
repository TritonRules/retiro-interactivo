import type { ParkService } from '../../types/service';
import { getServiceTypeLabel } from '../../utils/serviceTypes';

interface Props {
  service: ParkService;
  onClose: () => void;
  variant: 'mobile' | 'desktop';
}

export function ServiceSheet({ service, onClose, variant }: Props) {
  return (
    <aside
      className={`ficha ficha--${variant}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="ficha-servicio-titulo"
    >
      <div className="ficha__header">
        <div>
          <span className="badge">{getServiceTypeLabel(service.type)}</span>
          {service.status === 'needs-review' ? (
            <span className="status-pill" style={{ marginLeft: '0.5rem' }}>
              Pendiente de revisión
            </span>
          ) : null}
          <h2 id="ficha-servicio-titulo" className="ficha__title">
            {service.name}
          </h2>
        </div>
        <button
          type="button"
          className="ficha__close"
          onClick={onClose}
          aria-label="Cerrar ficha del servicio"
        >
          ×
        </button>
      </div>
      <p className="ficha__desc">{service.shortDescription}</p>
      {service.availabilityNote ? (
        <p className="ficha__desc">{service.availabilityNote}</p>
      ) : null}
      {service.accessibility?.length ? (
        <ul className="ficha__tags" aria-label="Accesibilidad">
          {service.accessibility.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      <p className="ficha__desc">
        Fuente:{' '}
        <a href={service.sourceUrl} target="_blank" rel="noopener noreferrer">
          {service.sourceName}
        </a>
      </p>
      <div className="ficha__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </aside>
  );
}

import type { ParkService, Wheelchair } from '../../types/service';
import { walkingDirectionsUrl } from '../../utils/directions';
import { formatOpeningHours } from '../../utils/osmServices.shared.mjs';
import { getServiceLabel, serviceColor } from '../../utils/serviceTypes';

interface Props {
  service: ParkService;
  onClose: () => void;
  variant: 'mobile' | 'desktop';
}

const WHEELCHAIR_LABEL: Record<Wheelchair, string> = {
  yes: 'Accesible en silla de ruedas',
  limited: 'Accesibilidad limitada',
  no: 'No accesible en silla de ruedas',
};

export function ServiceSheet({ service, onClose, variant }: Props) {
  const fromOsm = service.origin === 'osm';
  const hours = formatOpeningHours(service.openingHours);
  const facts = [
    service.wheelchair ? WHEELCHAIR_LABEL[service.wheelchair] : null,
    service.fee === false ? 'Gratuito' : service.fee === true ? 'De pago' : null,
    ...(service.accessibility ?? []),
  ].filter((item): item is string => Boolean(item));

  return (
    <aside
      className={`ficha ficha--${variant}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="ficha-servicio-titulo"
      data-service-id={service.id}
    >
      <div className="ficha__header">
        <div>
          <span className="badge badge--servicio" style={{ background: serviceColor(service) }}>
            {getServiceLabel(service)}
          </span>
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
      {fromOsm ? (
        service.near ? (
          <p className="ficha__desc">Cerca de {service.near}.</p>
        ) : null
      ) : (
        <p className="ficha__desc">{service.shortDescription}</p>
      )}
      <dl className="ficha__facts">
        <div>
          <dt>Horario</dt>
          <dd>
            {hours ? (
              <>
                {hours}
                {fromOsm || !service.availabilityNote ? (
                  <span className="ficha__muted"> (según OpenStreetMap)</span>
                ) : null}
              </>
            ) : (
              (service.availabilityNote ?? 'Sin horario publicado; confirmar in situ.')
            )}
          </dd>
        </div>
      </dl>
      {facts.length ? (
        <ul className="ficha__tags" aria-label="Accesibilidad y condiciones">
          {facts.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      <div className="ficha__actions">
        <a
          className="btn btn--primary"
          href={walkingDirectionsUrl(service.coordinates)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Cómo llegar
        </a>
        {service.menuUrl ? (
          <a
            className="btn btn--secondary"
            href={service.menuUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Carta
          </a>
        ) : null}
        {service.website ? (
          <a
            className="btn btn--secondary"
            href={service.website}
            target="_blank"
            rel="noopener noreferrer"
          >
            Web
          </a>
        ) : null}
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <p className="ficha__source">
        Fuente:{' '}
        <a href={service.sourceUrl} target="_blank" rel="noopener noreferrer">
          {fromOsm ? '© colaboradores de OpenStreetMap' : service.sourceName}
        </a>
        {fromOsm ? ` · datos a ${service.lastVerifiedAt}` : null}
      </p>
    </aside>
  );
}

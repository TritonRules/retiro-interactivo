import type { ParkService, Wheelchair } from '../../types/service';
import { walkingDirectionsUrl } from '../../utils/directions';
import { formatOpeningHours } from '../../utils/osmServices.shared.mjs';
import {
  formatDateEs,
  formatEuros,
  priceFreshness,
  statusIsCurrent,
  todayIso,
  type InfoSourceType,
  type ServiceHours,
  type ServicePrices,
} from '../../utils/serviceInfo.shared.mjs';
import { getServiceLabel, serviceColor } from '../../utils/serviceTypes';

interface Props {
  service: ParkService;
  onClose: () => void;
  variant: 'mobile' | 'desktop';
  /** Fecha de referencia AAAA-MM-DD para la caducidad de precios (por defecto, hoy). */
  today?: string;
}

const HOURS_SOURCE: Record<InfoSourceType, string> = {
  official: 'según el Ayuntamiento',
  venue: 'según la web del local',
  google: 'según Google',
};

const STATUS_SOURCE: Record<InfoSourceType, string> = {
  official: 'según el Ayuntamiento',
  venue: 'según el local',
  google: 'según Google',
};

function HoursValue({ hours }: { hours: ServiceHours }) {
  const text = hours.text ?? formatOpeningHours(hours.openingHours);
  const meta = [
    `${HOURS_SOURCE[hours.sourceType]}, ${formatDateEs(hours.checkedAt)}`,
    hours.mayVary ? 'puede variar' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <>
      {text}{' '}
      <span className="ficha__muted">
        (
        {hours.sourceUrl ? (
          <a href={hours.sourceUrl} target="_blank" rel="noopener noreferrer">
            {meta}
          </a>
        ) : (
          meta
        )}
        )
      </span>
      {hours.note ? <span className="ficha__muted ficha__block">{hours.note}</span> : null}
    </>
  );
}

function PriceBlock({ prices, today }: { prices: ServicePrices; today: string }) {
  const freshness = priceFreshness(prices, today);
  if (freshness === 'expired') return null;
  const official = prices.sourceType === 'official';
  const label = official
    ? `Precio público ${prices.validYear} · Ayuntamiento`
    : `Precio orientativo · carta del local · consultado el ${formatDateEs(prices.checkedAt)}`;
  const documentDate =
    !official && prices.sourceDate !== prices.checkedAt
      ? ` · carta del ${formatDateEs(prices.sourceDate)}`
      : '';
  return (
    <section
      className={`ficha__prices${freshness === 'aging' ? ' ficha__prices--aging' : ''}`}
      aria-label="Precios"
      data-price-freshness={freshness}
    >
      <ul className="ficha__price-list">
        {prices.items.map((entry) => (
          <li key={entry.item}>
            <span>
              {entry.item}
              {entry.note ? <span className="ficha__muted"> ({entry.note})</span> : null}
            </span>
            <span className="ficha__price">{formatEuros(entry.price)}</span>
          </li>
        ))}
      </ul>
      {prices.details ? <p className="ficha__price-meta">{prices.details}</p> : null}
      <p className="ficha__price-label">{label}</p>
      {freshness === 'aging' ? (
        <p className="ficha__price-warning" role="note">
          Carta de hace más de 9 meses: los precios pueden haber cambiado.
        </p>
      ) : null}
      <p className="ficha__price-meta">
        Fuente:{' '}
        <a href={prices.sourceUrl} target="_blank" rel="noopener noreferrer">
          {prices.sourceLabel}
        </a>
        {documentDate}
      </p>
    </section>
  );
}

const WHEELCHAIR_LABEL: Record<Wheelchair, string> = {
  yes: 'Accesible en silla de ruedas',
  limited: 'Accesibilidad limitada',
  no: 'No accesible en silla de ruedas',
};

export function ServiceSheet({ service, onClose, variant, today = todayIso() }: Props) {
  const fromOsm = service.origin === 'osm';
  const info = service.info;
  const hours = formatOpeningHours(service.openingHours);
  const status = info?.status && statusIsCurrent(info.status, today) ? info.status : null;
  const facts = [
    service.wheelchair ? WHEELCHAIR_LABEL[service.wheelchair] : null,
    service.fee === false ? 'Gratuito' : service.fee === true ? 'De pago' : null,
    ...(service.accessibility ?? []),
    ...(info?.highlights ?? []),
  ].filter((item): item is string => Boolean(item));

  return (
    <aside
      className={`ficha ficha--${variant}${info?.prices ? ' ficha--servicio-info' : ''}`}
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
      {status ? (
        <p className="ficha__alert" role="status">
          <strong>Cerrado temporalmente</strong> ({STATUS_SOURCE[status.sourceType]},{' '}
          {formatDateEs(status.checkedAt)})
          {status.note ? <span className="ficha__block">{status.note}</span> : null}
        </p>
      ) : null}
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
            {info?.hours ? (
              <HoursValue hours={info.hours} />
            ) : hours ? (
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
        {info?.phone ? (
          <div>
            <dt>Teléfono</dt>
            <dd>
              <a href={`tel:${info.phone.tel}`} aria-label={`Llamar al ${info.phone.display}`}>
                {info.phone.display}
              </a>
              {info.phone.sourceType === 'google' ? (
                <span className="ficha__muted"> (según Google)</span>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>
      {info?.prices ? <PriceBlock prices={info.prices} today={today} /> : null}
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

import { useMemo, useState } from 'react';
import { pruneFavorites } from '../../utils/favorites';
import { useFavorites } from '../../utils/useFavorites';
import { encodeVisitParam, planVisit, type RoutePoint } from '../../utils/customRoute';
import { formatWalkDistance, formatWalkingTime } from '../../utils/guidedWalk';
import {
  isInsideRetiro,
  isSecureGeolocationContext,
  requestCurrentPosition,
} from '../../utils/geolocation';
import type { VisitPreset } from '../../utils/visitPresets';

export interface VisitCatalogItem {
  kind: 'place' | 'service';
  id: string;
  name: string;
  label: string;
  coordinates: [number, number];
  /** Enlace «ver en el mapa» (ya con la base). */
  mapHref: string;
}

interface Props {
  catalog: VisitCatalogItem[];
  presets: VisitPreset[];
  baseUrl: string;
}

type LocState = 'idle' | 'prompting' | 'ok' | 'outside' | 'error';

const LOC_MESSAGE: Record<LocState, string> = {
  idle: 'Sin ubicación: la ruta empieza en la puerta más conveniente.',
  prompting: 'Buscando tu ubicación…',
  ok: 'La ruta empieza en tu ubicación.',
  outside: 'Estás fuera del parque: la ruta empieza en la puerta más conveniente.',
  error: 'No se pudo obtener tu ubicación: la ruta empieza en la puerta más conveniente.',
};

export default function MiVisita({ catalog, presets, baseUrl }: Props) {
  const favorites = useFavorites();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locState, setLocState] = useState<LocState>('idle');

  const byKey = useMemo(
    () => new Map(catalog.map((item) => [`${item.kind}:${item.id}`, item])),
    [catalog],
  );
  const saved = useMemo(() => {
    const known = {
      places: new Set(catalog.filter((c) => c.kind === 'place').map((c) => c.id)),
      services: new Set(catalog.filter((c) => c.kind === 'service').map((c) => c.id)),
    };
    return pruneFavorites(favorites.items, known)
      .sort((a, b) => a.savedAt - b.savedAt)
      .map((f) => byKey.get(`${f.kind}:${f.id}`))
      .filter((item): item is VisitCatalogItem => Boolean(item));
  }, [favorites.items, catalog, byKey]);

  const plan = useMemo(() => {
    if (saved.length < 2) return null;
    const points: RoutePoint[] = saved.map((item) => ({
      key: `${item.kind}:${item.id}`,
      name: item.name,
      coordinates: item.coordinates,
    }));
    return planVisit(points, userLocation);
  }, [saved, userLocation]);

  const mapBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const visitParam = plan ? encodeVisitParam(plan.stops.map((s) => s.key)) : '';
  const fromParam =
    plan?.start.kind === 'entrance' && plan.start.id ? `&desde=${plan.start.id}` : '';
  const routeHref = `${mapBase}?visita=${visitParam}${fromParam}`;

  const useLocation = async () => {
    if (!isSecureGeolocationContext()) {
      setLocState('error');
      return;
    }
    setLocState('prompting');
    try {
      const loc = await requestCurrentPosition();
      if (isInsideRetiro(loc.coordinates)) {
        setUserLocation(loc.coordinates);
        setLocState('ok');
      } else {
        setUserLocation(null);
        setLocState('outside');
      }
    } catch {
      setUserLocation(null);
      setLocState('error');
    }
  };

  if (!favorites.loaded) {
    return <p role="status">Cargando tu visita…</p>;
  }

  return (
    <div className="mi-visita">
      <section aria-labelledby="mv-guardados">
        <h2 id="mv-guardados">
          Guardados <span className="mi-visita__count">({saved.length})</span>
        </h2>
        {saved.length === 0 ? (
          <p className="mi-visita__empty">
            Aún no has guardado nada. Abre un lugar, estatua o servicio en el{' '}
            <a href={mapBase}>mapa</a> y pulsa «Guardar», o empieza con un atajo por intereses.
          </p>
        ) : (
          <ul className="mi-visita__list">
            {saved.map((item) => (
              <li key={`${item.kind}:${item.id}`} className="mi-visita__item">
                <div>
                  <span className="badge">{item.label}</span>
                  <strong className="mi-visita__name">{item.name}</strong>
                </div>
                <div className="mi-visita__item-actions">
                  <a className="btn btn--secondary" href={item.mapHref}>
                    Ver en el mapa
                  </a>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    aria-label={`Quitar ${item.name}`}
                    onClick={() => favorites.remove(item.kind, item.id)}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="mv-ruta" className="mi-visita__route">
        <h2 id="mv-ruta">Tu ruta</h2>
        {!plan ? (
          <p>Guarda al menos 2 sitios para crear una ruta propia.</p>
        ) : (
          <>
            <p className="mi-visita__summary" data-testid="mi-visita-resumen">
              <strong>{formatWalkDistance(plan.distanceMeters)}</strong> ·{' '}
              {formatWalkingTime(plan.distanceMeters)} · {plan.stops.length} paradas
            </p>
            <p className="mi-visita__note">
              Salida: {plan.start.name}. {LOC_MESSAGE[locState]} Orden calculado para andar lo menos
              posible; distancia aproximada (sin contar el tiempo en cada parada).
            </p>
            <ol className="mi-visita__stops">
              {plan.stops.map((stop) => (
                <li key={stop.key}>{stop.name}</li>
              ))}
            </ol>
            <div className="mi-visita__actions">
              <a className="btn btn--primary" href={`${routeHref}&paseo=1`}>
                Empezar ruta
              </a>
              <a className="btn btn--secondary" href={routeHref}>
                Ver ruta en el mapa
              </a>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => void useLocation()}
                disabled={locState === 'prompting'}
              >
                Salir desde mi ubicación
              </button>
            </div>
          </>
        )}
      </section>

      {presets.length > 0 ? (
        <section aria-labelledby="mv-intereses">
          <h2 id="mv-intereses">Por intereses</h2>
          <p className="mi-visita__note">Añade de golpe una selección a tus guardados.</p>
          <div className="mi-visita__presets">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="mi-visita__preset"
                onClick={() => favorites.addMany(preset.items)}
              >
                <strong>{preset.label}</strong>
                <span>{preset.description}</span>
              </button>
            ))}
          </div>
          {saved.length > 0 ? (
            <button type="button" className="btn btn--secondary" onClick={favorites.clear}>
              Vaciar Mi visita
            </button>
          ) : null}
        </section>
      ) : null}

      <p className="mi-visita__note">
        Tus guardados se quedan solo en este dispositivo (sin cuenta ni servidor) y funcionan sin
        conexión.
      </p>
    </div>
  );
}

import { GEO_STATUS_LABEL, isSecureGeolocationContext } from '../../utils/geolocation';
import { haversineMeters } from '../../utils/geo';
import {
  ARRIVAL_MAX_ACCURACY_M,
  elapsedMinutes,
  formatWalkDistance,
  formatWalkingTime,
  progressLabel,
  visitedCount,
} from '../../utils/guidedWalk';
import type { useGuidedWalk } from './useGuidedWalk';

type Walk = ReturnType<typeof useGuidedWalk>;

interface Props {
  walk: Walk;
  routeName: string;
  onFinish: () => void;
  onShowStop: (index: number) => void;
}

function statusMessage(
  walk: Walk,
): { text: string; offerDemo: boolean; offerRetry: boolean } | null {
  if (walk.source === 'demo') return null;
  const label = GEO_STATUS_LABEL[walk.geo];
  switch (walk.geo) {
    case 'idle':
    case 'prompting':
      return walk.position
        ? null
        : { text: `${GEO_STATUS_LABEL.prompting}`, offerDemo: false, offerRetry: false };
    case 'denied':
      return {
        text: `${label}. Activa la ubicación para este sitio en los ajustes del navegador o prueba el modo demostración.`,
        offerDemo: true,
        offerRetry: true,
      };
    case 'unavailable':
      return isSecureGeolocationContext()
        ? {
            text: `${label}. Comprueba que la ubicación del dispositivo está activada.`,
            offerDemo: true,
            offerRetry: true,
          }
        : {
            text: `${label}: la ubicación solo funciona en conexiones seguras (HTTPS).`,
            offerDemo: true,
            offerRetry: false,
          };
    case 'timeout':
      return {
        text: `${label}. Seguimos intentándolo; al aire libre la señal suele mejorar.`,
        offerDemo: true,
        offerRetry: true,
      };
    case 'error':
      return { text: `${label}.`, offerDemo: true, offerRetry: true };
    case 'outside':
      return {
        text: `${label}. El paseo avanzará cuando llegues al parque; mientras, puedes probarlo en modo demostración.`,
        offerDemo: true,
        offerRetry: false,
      };
    default:
      if (walk.position && walk.position.accuracy > ARRIVAL_MAX_ACCURACY_M) {
        return {
          text: `Señal GPS débil (±${Math.round(walk.position.accuracy)} m). Las llegadas se detectarán cuando mejore.`,
          offerDemo: false,
          offerRetry: false,
        };
      }
      return null;
  }
}

export function GuidedWalkPanel({ walk, routeName, onFinish, onShowStop }: Props) {
  const { state, stops, position, source } = walk;

  if (state.phase === 'completed') {
    const minutes = elapsedMinutes(state);
    return (
      <section className="walk-panel walk-panel--done" aria-label="Modo paseo" aria-live="polite">
        <div className="walk-panel__row">
          <div>
            <p className="walk-panel__eyebrow">{routeName}</p>
            <h2 className="walk-panel__title">
              <span aria-hidden="true">✓ </span>Ruta completada
            </h2>
          </div>
          <button type="button" className="btn btn--primary" onClick={onFinish}>
            Terminar
          </button>
        </div>
        <p className="walk-panel__meta">
          Has visitado {visitedCount(state)} de {state.total} paradas
          {minutes > 0 ? ` en ~${minutes} min` : ''}. ¡Gracias por pasear por El Retiro!
        </p>
      </section>
    );
  }

  const next = stops[state.index];
  const showDistance =
    position && next && (source === 'demo' || walk.geo === 'inside' || walk.geo === 'timeout');
  const distance = showDistance ? haversineMeters(position.coordinates, next.coordinates) : null;
  const justArrived =
    state.lastArrivedIndex !== null && state.lastArrivedIndex === state.index - 1
      ? stops[state.lastArrivedIndex]
      : null;
  const status = statusMessage(walk);

  return (
    <section className="walk-panel" aria-label="Modo paseo">
      <div className="walk-panel__row">
        <p className="walk-panel__eyebrow">
          <span className="walk-panel__progress-label">{progressLabel(state)}</span>
          {source === 'demo' ? <span className="walk-panel__badge">Demostración</span> : null}
        </p>
        <button type="button" className="btn btn--secondary walk-panel__finish" onClick={onFinish}>
          Terminar
        </button>
      </div>

      <ol className="walk-panel__dots" aria-hidden="true">
        {stops.map((stop, index) => (
          <li
            key={`${stop.id}-${index}`}
            className={
              state.visited[index] ? 'is-visited' : index === state.index ? 'is-next' : undefined
            }
          />
        ))}
      </ol>

      {justArrived ? (
        <p className="walk-panel__arrived" aria-live="polite">
          <span aria-hidden="true">✓ </span>Has llegado a {justArrived.name}
        </p>
      ) : null}
      <div className="walk-panel__next">
        <div className="walk-panel__next-info" aria-live="polite">
          <p className="walk-panel__label">Siguiente parada</p>
          <button
            type="button"
            className="walk-panel__stop"
            onClick={() => onShowStop(state.index)}
            title="Ver ficha de la parada"
          >
            {next?.name}
          </button>
          <p className="walk-panel__meta" data-testid="walk-distance">
            {distance !== null
              ? `${formatWalkDistance(distance)} · ${formatWalkingTime(distance)}`
              : 'Distancia no disponible'}
          </p>
        </div>
        <div className="walk-panel__nav">
          <button
            type="button"
            className="mapa-control-btn"
            onClick={walk.previous}
            disabled={state.index === 0}
            aria-label="Parada anterior"
            title="Parada anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className="mapa-control-btn"
            onClick={walk.skip}
            aria-label={state.index >= state.total - 1 ? 'Saltar parada y acabar' : 'Saltar parada'}
            title="Saltar parada"
          >
            ›
          </button>
        </div>
      </div>

      {status ? (
        <div className="walk-panel__status" role="status">
          <p>{status.text}</p>
          {status.offerRetry || status.offerDemo ? (
            <div className="walk-panel__status-actions">
              {status.offerRetry ? (
                <button type="button" className="btn btn--secondary" onClick={walk.retry}>
                  Reintentar
                </button>
              ) : null}
              {status.offerDemo ? (
                <button type="button" className="btn btn--primary" onClick={walk.startDemo}>
                  Modo demostración
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {source === 'demo' ? (
        <p className="walk-panel__hint">
          Simulación acelerada por el trazado de la ruta. No usa tu ubicación.
        </p>
      ) : null}
    </section>
  );
}

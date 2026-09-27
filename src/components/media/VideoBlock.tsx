import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { ParkVideo } from '../../types/video';
import {
  defaultVideoIndex,
  formatVideoDuration,
  hasVideos,
  scenarioOptionLabels,
  usesScenarioSelector,
  videoKindLabel,
  videoScenarioLabel,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from '../../utils/videos';

interface Props {
  videos: ParkVideo[] | undefined;
  /** Nivel del encabezado "Vídeos" según el contexto (ficha, página). */
  headingLevel?: 2 | 3;
  /** Plegado tras un botón (tarjeta de ruta en el mapa); se despliega en línea. */
  collapsible?: boolean;
  /** Lee `?escenario=` de la URL al montar (deep link). */
  readScenarioFromUrl?: boolean;
}

function VideoItem({ video, showScenario }: { video: ParkVideo; showScenario: boolean }) {
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (playing) frameRef.current?.focus();
  }, [playing]);

  const meta = [
    showScenario && video.scenario ? videoScenarioLabel(video.scenario) : null,
    video.kind ? videoKindLabel(video.kind) : null,
    video.durationSeconds ? formatVideoDuration(video.durationSeconds) : null,
  ].filter(Boolean);

  return (
    <li className="video">
      <div className="video__frame">
        {playing ? (
          <iframe
            ref={frameRef}
            className="video__iframe"
            src={youtubeEmbedUrl(video.youtubeId)}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="video__play"
            onClick={() => setPlaying(true)}
            aria-label={`Reproducir vídeo: ${video.title}`}
          >
            <img
              className="video__thumb"
              src={youtubeThumbnailUrl(video.youtubeId)}
              alt=""
              loading="lazy"
              decoding="async"
              width={480}
              height={360}
            />
            <span className="video__play-icon" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="video__title">{video.title}</p>
      {meta.length ? <p className="video__meta">{meta.join(' · ')}</p> : null}
      {video.description ? <p className="video__desc">{video.description}</p> : null}
      <a
        className="video__link"
        href={youtubeWatchUrl(video.youtubeId)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Ver en YouTube<span className="sr-only">: {video.title} (se abre en otra pestaña)</span>
      </a>
    </li>
  );
}

function ScenarioSelector({
  labels,
  selected,
  onSelect,
}: {
  labels: string[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (index: number) => {
    const next = (index + labels.length) % labels.length;
    onSelect(next);
    refs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const keys: Record<string, number> = {
      ArrowRight: selected + 1,
      ArrowDown: selected + 1,
      ArrowLeft: selected - 1,
      ArrowUp: selected - 1,
      Home: 0,
      End: labels.length - 1,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    move(keys[event.key]);
  };

  return (
    <div className="videos__scenarios" role="radiogroup" aria-label="Escenario del vídeo">
      {labels.map((label, index) => (
        <button
          key={label}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="button"
          role="radio"
          aria-checked={index === selected}
          tabIndex={index === selected ? 0 : -1}
          className="videos__scenario"
          onClick={() => onSelect(index)}
          onKeyDown={onKeyDown}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Bloque "Vídeos": no renderiza nada si el lugar o la ruta no tiene vídeos.
 * Con dos o más vídeos con escenario muestra un selector y un único vídeo.
 */
export function VideoBlock({
  videos,
  headingLevel = 3,
  collapsible = false,
  readScenarioFromUrl = false,
}: Props) {
  const headingId = useId();
  const panelId = useId();
  const list = hasVideos(videos) ? videos : [];
  const [selected, setSelected] = useState(() => defaultVideoIndex(list));
  const [expanded, setExpanded] = useState(!collapsible);

  useEffect(() => {
    if (!readScenarioFromUrl || list.length === 0) return;
    const requested = new URLSearchParams(window.location.search).get('escenario');
    if (!requested || !list.some((video) => video.scenario === requested)) return;
    setSelected(defaultVideoIndex(list, requested));
    setExpanded(true);
    // Solo al montar: el deep link fija el estado inicial.
  }, []);

  if (list.length === 0) return null;

  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const selector = usesScenarioSelector(list);
  const labels = selector ? scenarioOptionLabels(list) : [];
  const current = list[Math.min(selected, list.length - 1)];
  const hint =
    list.length === 1
      ? current.durationSeconds
        ? formatVideoDuration(current.durationSeconds)
        : null
      : selector
        ? `${list.length} vídeos · ${labels.join(', ')}`
        : `${list.length} vídeos`;

  return (
    <section
      className={`videos${collapsible ? ' videos--collapsible' : ''}`}
      aria-labelledby={headingId}
    >
      <Heading id={headingId} className={collapsible ? 'sr-only' : 'videos__heading'}>
        Vídeos
      </Heading>
      {collapsible ? (
        <button
          type="button"
          className="videos__toggle"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="videos__toggle-icon" aria-hidden="true" />
          <span className="videos__toggle-text">
            {expanded
              ? list.length > 1
                ? 'Ocultar vídeos'
                : 'Ocultar vídeo'
              : list.length > 1
                ? 'Ver vídeos del recorrido'
                : 'Ver vídeo del recorrido'}
          </span>
          {!expanded && hint ? <span className="videos__toggle-hint">{hint}</span> : null}
        </button>
      ) : null}
      <div id={panelId} className="videos__panel" hidden={!expanded}>
        {!expanded ? null : selector ? (
          <>
            <ScenarioSelector labels={labels} selected={selected} onSelect={setSelected} />
            <ul className="videos__list">
              {/* La key reinicia el vídeo (vuelve a la miniatura) al cambiar de escenario. */}
              <VideoItem key={current.youtubeId} video={current} showScenario={false} />
            </ul>
          </>
        ) : (
          <ul className="videos__list">
            {list.map((video) => (
              <VideoItem key={video.youtubeId} video={video} showScenario />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default VideoBlock;

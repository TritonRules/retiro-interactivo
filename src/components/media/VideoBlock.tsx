import { useEffect, useId, useRef, useState } from 'react';
import type { ParkVideo } from '../../types/video';
import {
  formatVideoDuration,
  hasVideos,
  videoKindLabel,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from '../../utils/videos';

interface Props {
  videos: ParkVideo[] | undefined;
  /** Nivel del encabezado "Vídeos" según el contexto (ficha, página). */
  headingLevel?: 2 | 3;
}

function VideoItem({ video }: { video: ParkVideo }) {
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (playing) frameRef.current?.focus();
  }, [playing]);

  const meta = [
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

/** Bloque "Vídeos": no renderiza nada si el lugar o la ruta no tiene vídeos. */
export function VideoBlock({ videos, headingLevel = 3 }: Props) {
  const headingId = useId();
  if (!hasVideos(videos)) return null;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className="videos" aria-labelledby={headingId}>
      <Heading id={headingId} className="videos__heading">
        Vídeos
      </Heading>
      <ul className="videos__list">
        {videos.map((video) => (
          <VideoItem key={video.youtubeId} video={video} />
        ))}
      </ul>
    </section>
  );
}

export default VideoBlock;

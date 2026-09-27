import type { ParkVideo, VideoKind, VideoScenario } from '../types/video';
import {
  GENERAL_SCENARIO_LABEL,
  VIDEO_KIND_LABELS,
  VIDEO_SCENARIO_LABELS,
} from './videos.shared.mjs';

export {
  parseYoutubeId,
  videoSchema,
  videosSchema,
  VIDEO_KINDS,
  VIDEO_SCENARIOS,
} from './videos.shared.mjs';

export function videoKindLabel(kind: VideoKind): string {
  return VIDEO_KIND_LABELS[kind];
}

export function videoScenarioLabel(scenario: VideoScenario | undefined): string {
  return scenario ? VIDEO_SCENARIO_LABELS[scenario] : GENERAL_SCENARIO_LABEL;
}

/** 95 → "1:35"; 3725 → "1:02:05". */
export function formatVideoDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Miniatura estática: no carga el reproductor ni cookies de YouTube. */
export function youtubeThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Reproductor en modo de privacidad mejorada; solo se inserta tras el clic. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function hasVideos(videos: ParkVideo[] | undefined): videos is ParkVideo[] {
  return Array.isArray(videos) && videos.length > 0;
}

/** El selector aparece cuando al menos dos vídeos declaran escenario. */
export function usesScenarioSelector(videos: ParkVideo[]): boolean {
  return videos.filter((video) => video.scenario).length >= 2;
}

/**
 * Etiqueta de cada opción del selector: el escenario (o «General») y, si dos
 * vídeos comparten escenario, también el tipo para distinguirlos.
 */
export function scenarioOptionLabels(videos: ParkVideo[]): string[] {
  const base = videos.map((video) => videoScenarioLabel(video.scenario));
  return videos.map((video, index) => {
    const repeated = base.filter((label) => label === base[index]).length > 1;
    return repeated && video.kind ? `${base[index]} · ${videoKindLabel(video.kind)}` : base[index];
  });
}

/**
 * Vídeo inicial: el escenario pedido (p. ej. `?escenario=lluvia`) si existe; si no,
 * el general, luego «soleado» y por último el primero.
 */
export function defaultVideoIndex(videos: ParkVideo[], requested?: string | null): number {
  const pick = (predicate: (video: ParkVideo) => boolean) => videos.findIndex(predicate);
  const candidates = [
    requested ? pick((video) => video.scenario === requested) : -1,
    pick((video) => !video.scenario),
    pick((video) => video.scenario === 'soleado'),
  ];
  return candidates.find((index) => index >= 0) ?? 0;
}

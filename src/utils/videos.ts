import type { ParkVideo, VideoKind } from '../types/video';

export { parseYoutubeId, videoSchema, videosSchema } from './videos.shared.mjs';

const KIND_LABELS: Record<VideoKind, string> = {
  infografia: 'Infografía',
  '3d': '3D',
  ia: 'Creado con IA',
  visita: 'Visita',
};

export function videoKindLabel(kind: VideoKind): string {
  return KIND_LABELS[kind];
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

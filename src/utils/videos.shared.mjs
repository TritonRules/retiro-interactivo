/**
 * Vídeos opcionales de lugares y rutas. Compartido por la app (validatePlaces /
 * validateRoutes) y por el validador de datos del CLI (scripts/validate-places.mjs).
 */
import { z } from 'zod';

export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
export const VIDEO_KINDS = ['infografia', '3d', 'ia', 'visita'];

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

/**
 * Devuelve el id de 11 caracteres a partir de un id o de una URL de YouTube
 * (watch?v=, youtu.be/, /embed/, /shorts/, /live/). `null` si no es válido.
 */
export function parseYoutubeId(input) {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (YOUTUBE_ID_PATTERN.test(value)) return value;

  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase();
  let candidate = null;
  if (host === 'youtu.be') {
    candidate = url.pathname.split('/')[1] ?? null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    const [, first, second] = url.pathname.split('/');
    if (first === 'watch') candidate = url.searchParams.get('v');
    else if (['embed', 'shorts', 'live'].includes(first)) candidate = second ?? null;
  }
  return candidate && YOUTUBE_ID_PATTERN.test(candidate) ? candidate : null;
}

export const videoSchema = z.strictObject({
  youtubeId: z.string().transform((value, ctx) => {
    const id = parseYoutubeId(value);
    if (!id) {
      ctx.addIssue({
        code: 'custom',
        message: 'youtubeId debe ser un id de YouTube de 11 caracteres o una URL de YouTube',
      });
      return z.NEVER;
    }
    return id;
  }),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(1).max(400).optional(),
  kind: z.enum(VIDEO_KINDS).optional(),
  durationSeconds: z.number().int().positive().max(4 * 60 * 60).optional(),
});

export const videosSchema = z
  .array(videoSchema)
  .superRefine((videos, ctx) => {
    const seen = new Set();
    videos.forEach((video, index) => {
      if (seen.has(video.youtubeId)) {
        ctx.addIssue({
          code: 'custom',
          message: `vídeo duplicado: ${video.youtubeId}`,
          path: [index, 'youtubeId'],
        });
      }
      seen.add(video.youtubeId);
    });
  })
  .optional();

/**
 * Vídeos opcionales de lugares y rutas. Compartido por la app (validatePlaces /
 * validateRoutes) y por el validador de datos del CLI (scripts/validate-places.mjs).
 */
import { z } from 'zod';

export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/**
 * Vocabularios controlados: id en los datos → etiqueta en la interfaz.
 * Para añadir un valor basta con una línea aquí (validador y UI lo leen de este objeto).
 */
export const VIDEO_KIND_LABELS = {
  visita: 'Paseo',
  infografia: 'Infografía',
  '3d': '3D',
  ia: 'Animación IA',
};

/** Condiciones del recorrido. Sin `scenario` el vídeo es «General». */
export const VIDEO_SCENARIO_LABELS = {
  soleado: 'Soleado',
  lluvia: 'Lluvia',
  otono: 'Otoño',
  primavera: 'Primavera',
  viento: 'Viento',
  frio: 'Frío',
  nieve: 'Nieve',
  atardecer: 'Atardecer',
  noche: 'Noche',
};

export const GENERAL_SCENARIO_LABEL = 'General';

export const VIDEO_KINDS = Object.keys(VIDEO_KIND_LABELS);
export const VIDEO_SCENARIOS = Object.keys(VIDEO_SCENARIO_LABELS);

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
  scenario: z.enum(VIDEO_SCENARIOS).optional(),
  durationSeconds: z.number().int().positive().max(4 * 60 * 60).optional(),
});

export const videosSchema = z
  .array(videoSchema)
  .superRefine((videos, ctx) => {
    const seen = new Set();
    const slots = new Set();
    videos.forEach((video, index) => {
      if (seen.has(video.youtubeId)) {
        ctx.addIssue({
          code: 'custom',
          message: `vídeo duplicado: ${video.youtubeId}`,
          path: [index, 'youtubeId'],
        });
      }
      seen.add(video.youtubeId);

      // Como mucho un vídeo por combinación escenario + tipo (ausente = general).
      const slot = `${video.scenario ?? 'general'}|${video.kind ?? 'general'}`;
      if (slots.has(slot)) {
        ctx.addIssue({
          code: 'custom',
          message: `ya hay un vídeo con escenario «${video.scenario ?? 'general'}» y tipo «${video.kind ?? 'general'}»`,
          path: [index, 'scenario'],
        });
      }
      slots.add(slot);
    });
  })
  .optional();

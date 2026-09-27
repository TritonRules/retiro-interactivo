import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import placesData from '../data/places.json';
import routesData from '../data/routes.json';
import { VideoBlock } from '../components/media/VideoBlock';
import { validatePlaces } from './validatePlaces';
import { validateRoutes } from './validateRoutes';
import {
  formatVideoDuration,
  parseYoutubeId,
  videosSchema,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
} from './videos';

const ID = 'aqz-KE-bpKQ';

describe('parseYoutubeId', () => {
  it.each([
    [ID, ID],
    [` ${ID} `, ID],
    [`https://www.youtube.com/watch?v=${ID}`, ID],
    [`https://www.youtube.com/watch?v=${ID}&t=30s`, ID],
    [`https://m.youtube.com/watch?v=${ID}`, ID],
    [`https://youtu.be/${ID}?si=abc`, ID],
    [`https://www.youtube.com/embed/${ID}`, ID],
    [`https://www.youtube-nocookie.com/embed/${ID}`, ID],
    [`https://www.youtube.com/shorts/${ID}`, ID],
  ])('acepta %s', (input, expected) => {
    expect(parseYoutubeId(input)).toBe(expected);
  });

  it.each([
    '',
    'abc',
    'aqz-KE-bpKQX',
    'aqz KE bpKQ',
    `https://vimeo.com/${ID}`,
    `https://example.com/watch?v=${ID}`,
    `javascript:alert('${ID}')`,
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/channel/UC1234567890',
    42,
  ])('rechaza %s', (input) => {
    expect(parseYoutubeId(input)).toBeNull();
  });
});

describe('videosSchema', () => {
  it('la ausencia de vídeos es válida', () => {
    expect(videosSchema.safeParse(undefined).success).toBe(true);
  });

  it('normaliza una URL completa al id', () => {
    const parsed = videosSchema.parse([
      { youtubeId: `https://youtu.be/${ID}`, title: 'Palacio de Cristal en 3D', kind: '3d' },
    ]);
    expect(parsed?.[0].youtubeId).toBe(ID);
  });

  it.each([
    [{ title: 'Sin id' }],
    [{ youtubeId: 'mal', title: 'Id corto' }],
    [{ youtubeId: ID }],
    [{ youtubeId: ID, title: '' }],
    [{ youtubeId: ID, title: 'Tipo raro', kind: 'drone' }],
    [{ youtubeId: ID, title: 'Duración negativa', durationSeconds: -5 }],
    [{ youtubeId: ID, title: 'Duración decimal', durationSeconds: 1.5 }],
    [{ youtubeId: ID, title: 'Campo desconocido', url: 'https://youtu.be/x' }],
  ])('rechaza la entrada mal formada %j', (video) => {
    expect(videosSchema.safeParse([video]).success).toBe(false);
  });

  it('rechaza vídeos duplicados', () => {
    const result = videosSchema.safeParse([
      { youtubeId: ID, title: 'Uno' },
      { youtubeId: `https://youtu.be/${ID}`, title: 'Otro' },
    ]);
    expect(result.success).toBe(false);
  });
});

describe('vídeos en lugares y rutas', () => {
  const place = placesData.find((item) => item.id === 'palacio-de-cristal')!;
  const route = routesData[0];
  const placeIds = new Set(placesData.map((item) => item.id));

  it('un lugar con un vídeo mal formado no pasa la validación', () => {
    const bad = { ...place, videos: [{ youtubeId: 'no es un id válido', title: 'Vídeo' }] };
    const result = validatePlaces([bad]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toMatch(/videos\.0\.youtubeId/);
  });

  it('un lugar con un vídeo válido lo conserva normalizado', () => {
    const good = { ...place, videos: [{ youtubeId: `https://youtu.be/${ID}`, title: 'Vídeo' }] };
    const result = validatePlaces([good]);
    expect(result.ok && result.places[0].videos?.[0].youtubeId).toBe(ID);
  });

  it('una ruta con un vídeo mal formado no pasa la validación', () => {
    const routes = routesData.map((item, index) =>
      index === 0 ? { ...item, videos: [{ youtubeId: ID, title: 'x' }] } : item,
    );
    expect(validateRoutes(routes, placeIds).ok).toBe(false);
    expect(validateRoutes(routesData, placeIds).ok).toBe(true);
    expect(route.id).toBeTruthy();
  });
});

describe('VideoBlock', () => {
  it('no renderiza nada sin vídeos', () => {
    expect(renderToStaticMarkup(createElement(VideoBlock, { videos: undefined }))).toBe('');
    expect(renderToStaticMarkup(createElement(VideoBlock, { videos: [] }))).toBe('');
  });

  it('muestra miniatura y botón, sin iframe hasta el clic', () => {
    const markup = renderToStaticMarkup(
      createElement(VideoBlock, {
        videos: [{ youtubeId: ID, title: 'Palacio de Cristal', kind: 'infografia', durationSeconds: 95 }],
      }),
    );
    expect(markup).toContain('Vídeos');
    expect(markup).toContain(youtubeThumbnailUrl(ID));
    expect(markup).toContain('aria-label="Reproducir vídeo: Palacio de Cristal"');
    expect(markup).toContain(`https://www.youtube.com/watch?v=${ID}`);
    expect(markup).toContain('Infografía · 1:35');
    expect(markup).not.toContain('<iframe');
    expect(youtubeEmbedUrl(ID)).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/aqz-KE-bpKQ/);
  });

  it('formatea duraciones', () => {
    expect(formatVideoDuration(95)).toBe('1:35');
    expect(formatVideoDuration(3725)).toBe('1:02:05');
  });
});

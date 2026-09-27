import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import placesData from '../data/places.json';
import routesData from '../data/routes.json';
import { VideoBlock } from '../components/media/VideoBlock';
import { validatePlaces } from './validatePlaces';
import { validateRoutes } from './validateRoutes';
import type { ParkVideo, VideoKind, VideoScenario } from '../types/video';
import {
  defaultVideoIndex,
  scenarioOptionLabels,
  usesScenarioSelector,
  VIDEO_KINDS,
  VIDEO_SCENARIOS,
  videoScenarioLabel,
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
        videos: [
          { youtubeId: ID, title: 'Palacio de Cristal', kind: 'infografia', durationSeconds: 95 },
        ],
      }),
    );
    expect(markup).toContain('Vídeos');
    expect(markup).toContain(youtubeThumbnailUrl(ID));
    expect(markup).toContain('aria-label="Reproducir vídeo: Palacio de Cristal"');
    expect(markup).toContain(`https://www.youtube.com/watch?v=${ID}`);
    expect(markup).toContain('Infografía · 1:35');
    expect(markup).not.toContain('<iframe');
    expect(youtubeEmbedUrl(ID)).toMatch(
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/aqz-KE-bpKQ/,
    );
  });

  it('formatea duraciones', () => {
    expect(formatVideoDuration(95)).toBe('1:35');
    expect(formatVideoDuration(3725)).toBe('1:02:05');
  });
});

describe('escenarios', () => {
  it('los vocabularios de ejecución coinciden con los tipos TS', () => {
    const scenarios: VideoScenario[] = [
      'soleado',
      'lluvia',
      'otono',
      'primavera',
      'viento',
      'frio',
      'nieve',
      'atardecer',
      'noche',
    ];
    const kinds: VideoKind[] = ['visita', 'infografia', '3d', 'ia'];
    expect([...VIDEO_SCENARIOS].sort()).toEqual([...scenarios].sort());
    expect([...VIDEO_KINDS].sort()).toEqual([...kinds].sort());
  });

  it('acepta escenarios conocidos y etiqueta en español', () => {
    const parsed = videosSchema.parse([
      { youtubeId: ID, title: 'Paseo con lluvia', kind: 'visita', scenario: 'lluvia' },
      { youtubeId: 'eRsGyueVLvQ', title: 'Paseo en otoño', kind: 'visita', scenario: 'otono' },
    ]);
    expect(parsed?.map((video) => video.scenario)).toEqual(['lluvia', 'otono']);
    expect(videoScenarioLabel('otono')).toBe('Otoño');
    expect(videoScenarioLabel('frio')).toBe('Frío');
    expect(videoScenarioLabel(undefined)).toBe('General');
  });

  it('rechaza un escenario desconocido', () => {
    const result = videosSchema.safeParse([
      { youtubeId: ID, title: 'Granizo', scenario: 'granizo' },
    ]);
    expect(result.success).toBe(false);
  });

  it('rechaza dos vídeos con el mismo escenario y tipo', () => {
    const result = videosSchema.safeParse([
      { youtubeId: ID, title: 'Lluvia 1', kind: 'visita', scenario: 'lluvia' },
      { youtubeId: 'eRsGyueVLvQ', title: 'Lluvia 2', kind: 'visita', scenario: 'lluvia' },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual([1, 'scenario']);
  });

  it('rechaza dos vídeos generales del mismo tipo', () => {
    const result = videosSchema.safeParse([
      { youtubeId: ID, title: 'General 1' },
      { youtubeId: 'eRsGyueVLvQ', title: 'General 2' },
    ]);
    expect(result.success).toBe(false);
  });

  it('permite el mismo escenario con tipos distintos y los distingue en el selector', () => {
    const videos = videosSchema.parse([
      { youtubeId: ID, title: 'Nieve paseo', kind: 'visita', scenario: 'nieve' },
      { youtubeId: 'eRsGyueVLvQ', title: 'Nieve IA', kind: 'ia', scenario: 'nieve' },
      { youtubeId: 'WhWc3b3KhnY', title: 'General' },
    ]) as ParkVideo[];
    expect(scenarioOptionLabels(videos)).toEqual([
      'Nieve · Paseo',
      'Nieve · Animación IA',
      'General',
    ]);
  });

  it('selector solo con dos o más vídeos con escenario', () => {
    const v = (scenario?: VideoScenario): ParkVideo => ({ youtubeId: ID, title: 't', scenario });
    expect(usesScenarioSelector([v('lluvia')])).toBe(false);
    expect(usesScenarioSelector([v(), v()])).toBe(false);
    expect(usesScenarioSelector([v('lluvia'), v()])).toBe(false);
    expect(usesScenarioSelector([v('lluvia'), v('otono')])).toBe(true);
  });

  it('vídeo por defecto: pedido, general, soleado, primero', () => {
    const v = (scenario?: VideoScenario): ParkVideo => ({ youtubeId: ID, title: 't', scenario });
    const withGeneral = [v('lluvia'), v(), v('soleado')];
    expect(defaultVideoIndex(withGeneral)).toBe(1);
    expect(defaultVideoIndex(withGeneral, 'lluvia')).toBe(0);
    expect(defaultVideoIndex(withGeneral, 'granizo')).toBe(1);
    expect(defaultVideoIndex([v('lluvia'), v('soleado')])).toBe(1);
    expect(defaultVideoIndex([v('lluvia'), v('otono')])).toBe(0);
  });

  it('bloque con escenarios: un solo vídeo, selector y opción por defecto marcada', () => {
    const markup = renderToStaticMarkup(
      createElement(VideoBlock, {
        videos: [
          {
            youtubeId: 'eRsGyueVLvQ',
            title: 'Paseo con lluvia',
            kind: 'visita',
            scenario: 'lluvia',
          },
          { youtubeId: ID, title: 'Paseo soleado', kind: 'visita', scenario: 'soleado' },
        ],
      }),
    );
    expect(markup).toContain('role="radiogroup"');
    expect(markup).toMatch(/aria-checked="true"[^>]*>Soleado</);
    expect(markup).toContain('Paseo soleado');
    expect(markup).not.toContain('Paseo con lluvia');
    expect(markup).not.toContain('<iframe');
  });

  it('bloque plegable: solo el botón hasta desplegar', () => {
    const markup = renderToStaticMarkup(
      createElement(VideoBlock, {
        collapsible: true,
        videos: [
          { youtubeId: 'eRsGyueVLvQ', title: 'Paseo con lluvia', scenario: 'lluvia' },
          { youtubeId: ID, title: 'Paseo soleado', scenario: 'soleado' },
        ],
      }),
    );
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('Ver vídeos del recorrido');
    expect(markup).toContain('2 vídeos · Lluvia, Soleado');
    expect(markup).not.toContain('i.ytimg.com');
  });
});

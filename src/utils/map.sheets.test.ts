import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { EventSheet } from '../components/places/EventSheet';
import { PlaceSheet } from '../components/places/PlaceSheet';
import { ServiceSheet } from '../components/places/ServiceSheet';
import type { Place } from '../types/place';
import type { ParkService } from '../types/service';

const read = (relative: string) => readFileSync(join(process.cwd(), relative), 'utf8');
const stylesheets = ['src/styles/global.css', 'src/styles/map.css'].map(read).join('\n');

/** Clases del markup que no aparecen como selector en ninguna hoja de estilos. */
function unstyledClasses(markup: string): string[] {
  const classes = new Set<string>();
  for (const attr of markup.matchAll(/class="([^"]*)"/g)) {
    attr[1].split(/\s+/).filter(Boolean).forEach((name) => classes.add(name));
  }
  return [...classes].filter((name) => !new RegExp(`\\.${name}\\b`).test(stylesheets));
}

const event = {
  id: 'evt-1',
  slug: 'concierto-de-prueba',
  title: 'Concierto de prueba',
  coordinates: [-3.6844, 40.4153] as [number, number],
  startAt: '2026-08-10T19:30:00+02:00',
  expiresAt: '2026-08-10T21:00:00+02:00',
  venue: 'Centro Cultural Casa de Vacas (Retiro)',
  status: 'published' as const,
  sourceUrl: 'https://www.madrid.es/',
  category: 'Musica',
  lastCheckedAt: '2026-08-10T10:00:00.000Z',
};

const place = {
  id: 'plc-1',
  slug: 'estanque-grande',
  name: 'Estanque Grande del Retiro',
  shortDescription: 'Lámina de agua central del parque.',
  category: 'iconico',
  tags: ['agua'],
  coordinates: [-3.6844, 40.4153],
  status: 'verified',
} as unknown as Place;

const service = {
  id: 'svc-1',
  name: 'Aseo público',
  shortDescription: 'Aseo cercano al estanque.',
  type: 'aseo',
  coordinates: [-3.6844, 40.4153],
  sourceName: 'OpenStreetMap',
  sourceUrl: 'https://www.openstreetmap.org/',
  status: 'verified',
} as unknown as ParkService;

describe('fichas sobre el mapa', () => {
  it('muestra el evento seleccionado en un overlay con estilos reales', () => {
    const markup = renderToStaticMarkup(
      createElement(EventSheet, {
        event,
        eventHref: '/retiro-interactivo/agenda/concierto-de-prueba/',
        onClose: () => {},
        variant: 'desktop',
      }),
    );

    expect(markup).toContain('class="ficha ficha--desktop"');
    expect(unstyledClasses(markup)).toEqual([]);
    // El defecto original: clases sin ninguna regla, con el lienzo del mapa encima.
    expect(unstyledClasses('<aside class="place-sheet place-sheet--desktop">')).toEqual([
      'place-sheet',
      'place-sheet--desktop',
    ]);
    expect(markup).toContain('Concierto de prueba');
    expect(markup).toContain('Centro Cultural Casa de Vacas (Retiro)');
    expect(markup).toContain('10 ago 2026');
    expect(markup).toContain('href="/retiro-interactivo/agenda/concierto-de-prueba/"');
    expect(markup).toContain('Cerrar ficha del evento');
    expect(markup).toContain('role="dialog"');
  });

  it('coloca la ficha por encima del lienzo del mapa', () => {
    const rule = read('src/styles/map.css').match(/\.ficha\s*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).toMatch(/position:\s*absolute/);
    expect(rule).toMatch(/z-index:\s*[1-9]/);
  });

  it('usa la variante móvil del mismo overlay en pantallas pequeñas', () => {
    const markup = renderToStaticMarkup(
      createElement(EventSheet, {
        event,
        eventHref: '/agenda/concierto-de-prueba/',
        onClose: () => {},
        variant: 'mobile',
      }),
    );

    expect(markup).toContain('class="ficha ficha--mobile"');
    expect(unstyledClasses(markup)).toEqual([]);
  });

  it('no reintroduce el markup sin estilos de la ficha de evento', () => {
    expect(read('src/components/map/MapExplorer.tsx')).not.toContain('place-sheet');
  });

  it('mantiene las fichas de lugar y servicio en el mismo overlay', () => {
    const placeMarkup = renderToStaticMarkup(
      createElement(PlaceSheet, {
        place,
        placeHref: '/lugares/estanque-grande/',
        onClose: () => {},
        variant: 'desktop',
      }),
    );
    const serviceMarkup = renderToStaticMarkup(
      createElement(ServiceSheet, { service, onClose: () => {}, variant: 'mobile' }),
    );

    expect(placeMarkup).toContain('class="ficha ficha--desktop"');
    expect(serviceMarkup).toContain('class="ficha ficha--mobile"');
    expect(unstyledClasses(placeMarkup)).toEqual([]);
    expect(unstyledClasses(serviceMarkup)).toEqual([]);
  });

  it('sigue seleccionando el evento indicado en `?evento=`', () => {
    const content = read('src/components/map/MapExplorer.tsx');
    expect(content).toContain("params.get('evento')");
    expect(content).toContain('events.find((item) => item.slug === eventSlugState)');
    expect(content).toContain("setSelection({ kind: 'event', id: event.id })");
    expect(content).toContain('<EventSheet');
  });
});

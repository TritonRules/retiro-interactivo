import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EventSheet } from '../components/places/EventSheet';
import { eventDetailPath } from './eventLinks';
import { events, eventsWithDetailPage } from './events';
import { eventPagePattern, shellNavigationPattern } from './serviceWorkerRoutes';

const BASE = '/retiro-interactivo/';
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const conFicha = new Set(eventsWithDetailPage().map((event) => event.slug));

describe('destinos de los eventos', () => {
  it('todos los slugs son válidos y únicos', () => {
    for (const event of events) {
      expect.soft(event.slug, event.title).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
    expect(new Set(events.map((e) => e.slug)).size).toBe(events.length);
  });

  it('genera ficha para todo evento publicado o caducado', () => {
    const paginas = read('src/pages/agenda/[slug].astro');
    expect(paginas).toContain('eventsWithDetailPage()');
    expect(conFicha.size).toBeGreaterThan(0);
    for (const event of events) {
      if (event.status === 'published' || event.status === 'expired') {
        expect.soft(conFicha.has(event.slug), event.slug).toBe(true);
      }
    }
  });

  it('enlaza desde la agenda solo a fichas existentes', () => {
    for (const event of events) {
      if (event.status === 'published' || event.status === 'expired') {
        expect.soft(conFicha.has(event.slug), `${event.title} sin ficha`).toBe(true);
        expect(eventDetailPath(event.slug)).toBe(`agenda/${event.slug}/`);
      }
    }
  });

  it('enlaza desde el mapa a la misma ruta que la agenda', () => {
    const evento = events.find((e) => e.coordinates);
    if (!evento) throw new Error('No hay eventos con coordenadas en el dataset');
    const markup = renderToStaticMarkup(
      createElement(EventSheet, {
        event: {
          id: evento.id,
          slug: evento.slug,
          title: evento.title,
          coordinates: evento.coordinates!,
          startAt: evento.startAt,
          endAt: evento.endAt,
          expiresAt: evento.expiresAt,
          venue: evento.venue,
          status: evento.status,
          lastCheckedAt: evento.lastCheckedAt,
          schedule: evento.schedule,
          sourceUrl: evento.sourceUrl,
          category: evento.category,
        },
        eventHref: `${BASE}${eventDetailPath(evento.slug)}`,
        onClose: () => {},
        variant: 'desktop',
      }),
    );

    expect(markup).toContain(`href="${BASE}agenda/${evento.slug}/"`);
    expect(markup).toContain('Ver ficha');
    expect(markup).not.toMatch(/href="#?"/);
  });

  it('mantiene la misma regla de enlace en el mapa y en la agenda', () => {
    expect(read('src/components/map/MapExplorer.tsx')).toContain(
      'eventDetailPath(selectedEvent.slug)',
    );
    const agenda = read('src/components/agenda/AgendaExplorer.tsx');
    expect(agenda).toContain('eventDetailPath(event.slug)');
    expect(agenda).not.toContain('href="#"');
    expect(read('src/pages/agenda/index.astro')).not.toMatch(/Astro\.url\.searchParams/);
  });
});

describe('navegación servida por el service worker', () => {
  const shell = shellNavigationPattern(BASE);
  const fichas = eventPagePattern(BASE);

  it('resuelve con la shell solo la propia shell y sus deep links', () => {
    for (const url of [BASE, `${BASE}?evento=x`, `${BASE}?lugar=estanque-grande`, `${BASE}?ruta=ruta-fotografica`]) {
      expect.soft(shell.test(url), url).toBe(true);
    }
    // El defecto de QA físico: la ficha de evento respondía con el mapa.
    for (const url of [`${BASE}agenda/`, `${BASE}agenda/un-evento-123/`, `${BASE}lugares/estanque-grande/`, `${BASE}rutas/`]) {
      expect.soft(shell.test(url), url).toBe(false);
    }
  });

  it('reconoce las fichas de evento como ruta propia', () => {
    expect(fichas.test(`https://tritonrules.github.io${BASE}agenda/un-evento-123/`)).toBe(true);
    expect(fichas.test(`https://tritonrules.github.io${BASE}agenda/`)).toBe(false);
    expect(fichas.test(`https://tritonrules.github.io${BASE}lugares/estanque-grande/`)).toBe(false);
  });

  it('configura la excepción y la respuesta de red en astro.config.mjs', () => {
    const config = read('astro.config.mjs');
    expect(config).toContain('navigateFallback: basePath');
    expect(config).toContain('navigateFallbackAllowlist: [shellNavigationPattern(basePath)]');
    expect(config).toContain('urlPattern: eventPagePattern(basePath)');
    expect(config).toContain("handler: 'NetworkFirst'");
    expect(config).toContain("precacheFallback: { fallbackURL: `${basePath}offline/` }");
    // Las fichas siguen fuera del precaché: por eso necesitan ruta propia.
    expect(config).toContain("globIgnores: ['**/agenda/*/index.html']");
  });
});

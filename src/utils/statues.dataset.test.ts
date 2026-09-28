import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import places from '../data/places.json';
import routes from '../data/routes.json';
import { PlaceSheet } from '../components/places/PlaceSheet';
import type { Place } from '../types/place';
import type { ParkRoute } from '../types/route';
import { formatArtworkCredit } from './artwork';
import { countByCategory, filterPlacesByCategory, parseCategoryParam } from './filterPlaces';
import { haversineMeters } from './geo';

const all = places as Place[];
const esculturas = all.filter((place) => place.category === 'escultura');

describe('estatuas y esculturas del Retiro', () => {
  it('publica el catálogo verificado con autoría, fecha y fuentes', () => {
    expect(esculturas.length).toBe(45);
    for (const place of esculturas) {
      expect(place.area, place.id).toBe('retiro');
      expect(place.status, place.id).toBe('verified');
      expect(place.sourceUrl, place.id).toMatch(/^https:\/\//);
      expect(place.lastVerifiedAt, place.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(place.artwork, place.id).toBeDefined();
      // Autoría o fecha, al menos una verificada.
      expect(formatArtworkCredit(place), place.id).not.toBeNull();
    }
  });

  it('no duplica lugares ya publicados (Alfonso XII, Ángel Caído…)', () => {
    const others = all.filter((place) => place.category !== 'escultura');
    const names = new Set(others.map((place) => place.name.toLowerCase()));
    for (const place of esculturas) {
      expect(names.has(place.name.toLowerCase()), place.id).toBe(false);
      for (const other of others) {
        // Nada encima de otro lugar: el más próximo está a más de 10 m.
        expect(haversineMeters(place.coordinates, other.coordinates), `${place.id}↔${other.id}`).toBeGreaterThan(10);
      }
    }
  });

  it('tiene su propio filtro «Estatuas»', () => {
    expect(parseCategoryParam('escultura')).toBe('escultura');
    expect(filterPlacesByCategory(all, 'escultura')).toHaveLength(esculturas.length);
    expect(countByCategory(all).escultura).toBe(esculturas.length);
  });

  it('la ficha del mapa muestra autoría y fecha', () => {
    const cajal = esculturas.find((place) => place.id === 'monumento-ramon-y-cajal')!;
    const markup = renderToStaticMarkup(
      createElement(PlaceSheet, { place: cajal, placeHref: '#', onClose: () => {}, variant: 'mobile' }),
    );
    expect(markup).toContain('Estatuas');
    expect(markup).toContain('Victorio Macho · 1926');
  });

  it('formatea la autoría con lo que haya verificado', () => {
    expect(formatArtworkCredit({ artwork: { authors: ['A', 'B'], date: '1907' } })).toBe('A, B · 1907');
    expect(formatArtworkCredit({ artwork: { date: '1991' } })).toBe('1991');
    expect(formatArtworkCredit({ artwork: { authors: [] } })).toBeNull();
    expect(formatArtworkCredit({})).toBeNull();
  });
});

describe('Ruta de las estatuas', () => {
  const route = (routes as ParkRoute[]).find((item) => item.slug === 'ruta-estatuas')!;

  it('encadena entre 10 y 18 paradas, casi todas estatuas', () => {
    expect(route).toBeDefined();
    expect(route.stopIds.length).toBeGreaterThanOrEqual(10);
    expect(route.stopIds.length).toBeLessThanOrEqual(18);
    const byId = new Map(all.map((place) => [place.id, place]));
    const statues = route.stopIds.filter((id) => byId.get(id)?.category === 'escultura');
    expect(statues.length).toBeGreaterThanOrEqual(route.stopIds.length - 2);
    expect(new Set(route.stopIds).size).toBe(route.stopIds.length);
    expect(route.startPlaceId).toBe(route.stopIds[0]);
    expect(route.endPlaceId).toBe(route.stopIds.at(-1));
  });

  it('duración coherente con la distancia real (paseo con paradas, 1,5–3 km/h)', () => {
    const kmh = route.approximateDistanceMeters / 1000 / (route.estimatedDurationMinutes / 60);
    expect(kmh).toBeGreaterThan(1.5);
    expect(kmh).toBeLessThan(3);
  });
});

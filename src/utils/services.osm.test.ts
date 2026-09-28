import { describe, expect, it } from 'vitest';
import type { PlaceCategory } from '../types/place';
import { CATEGORY_META } from './categories';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { osmIdFromUrl, osmServicesDatasetSchema, pointInRings } from './osmServices.shared.mjs';
import { mergeServices, osmServicesDataset, osmToParkService, services } from './services';
import {
  countServicesByGroup,
  filterServicesByGroup,
  parseServiceGroupParam,
  servicesVisibleAtZoom,
} from './filterPlaces';
import {
  SERVICE_ZOOM_TIER_A,
  SERVICE_ZOOM_TIER_B,
  serviceGroup,
  serviceMarkerPriority,
  serviceMinZoom,
} from './serviceTypes';
import { placeMarkerPriority } from './markerZoom';
import { walkingDirectionsUrl } from './directions';
import { withoutParkServicePois } from './basemapPois';
import type { OsmService, ParkService } from '../types/service';

const read = (relative: string) => JSON.parse(readFileSync(join(process.cwd(), relative), 'utf8'));

describe('services-osm.json', () => {
  const raw = read('src/data/services-osm.json');
  const curated: ParkService[] = read('src/data/services.json');

  it('cumple el esquema y declara la licencia ODbL', () => {
    const parsed = osmServicesDatasetSchema.safeParse(raw);
    expect(parsed.success, JSON.stringify(parsed.error?.issues?.slice(0, 3))).toBe(true);
    expect(raw.license).toBe('ODbL-1.0');
    expect(raw.attribution).toMatch(/OpenStreetMap/);
  });

  it('todos los servicios están dentro del contorno del parque', () => {
    for (const service of raw.services) {
      expect(pointInRings(service.coordinates, raw.boundary), service.id).toBe(true);
    }
  });

  it('no repite ningún elemento OSM que ya esté en services.json', () => {
    const curatedOsmIds = new Set(curated.map((s) => osmIdFromUrl(s.sourceUrl)).filter(Boolean));
    for (const service of raw.services) {
      expect(curatedOsmIds.has(service.osmId), service.osmId).toBe(false);
    }
    const ids = raw.services.map((s: OsmService) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('los recuentos coinciden con los datos', () => {
    expect(raw.counts.added_total).toBe(raw.services.length);
    expect(raw.counts.total).toBe(raw.services.length + raw.matches.length);
  });

  it('cubre los tipos que pide el visitante', () => {
    const subtypes = new Set(raw.services.map((s: OsmService) => s.subtype));
    for (const expected of ['cafe', 'bar', 'aseo', 'agua', 'parque-infantil', 'gimnasio']) {
      expect(subtypes.has(expected), expected).toBe(true);
    }
  });
});

describe('unión de servicios curados y OSM', () => {
  it('el curado gana y se completa con los datos OSM que le falten', () => {
    const curated = [
      {
        id: 'aseo-estanque',
        name: 'Aseo cerca del Estanque Grande',
        type: 'aseo',
        coordinates: [-3.68, 40.415],
        shortDescription: 'Aseo junto al estanque.',
        sourceName: 'OSM',
        sourceUrl: 'https://www.openstreetmap.org/node/6504526829',
        lastVerifiedAt: '2026-08-05',
        status: 'verified',
        availabilityNote: 'Confirmar in situ.',
      },
    ] as ParkService[];
    const merged = mergeServices(
      curated,
      [],
      [
        {
          osmId: 'node/6504526829',
          subtype: 'aseo',
          matchedId: 'aseo-estanque',
          matchedKind: 'service',
          reason: 'osm-id',
          enrich: { openingHours: 'Mo-Su 10:00-20:00', fee: false },
        },
      ],
    );
    expect(merged[0]).toMatchObject({
      id: 'aseo-estanque',
      name: 'Aseo cerca del Estanque Grande',
      subtype: 'aseo',
      origin: 'curated',
      openingHours: 'Mo-Su 10:00-20:00',
      fee: false,
    });
  });

  it('convierte los OSM en servicios con fuente y fecha', () => {
    const service = osmToParkService({
      id: 'osm-node-1',
      osmId: 'node/1',
      name: 'Parque infantil',
      named: false,
      type: 'zona-infantil',
      subtype: 'parque-infantil',
      coordinates: [-3.68, 40.415],
      lastCheckedAt: '2026-09-28',
      near: 'Casita del Pescador',
    });
    expect(service).toMatchObject({
      origin: 'osm',
      sourceUrl: 'https://www.openstreetmap.org/node/1',
      lastVerifiedAt: '2026-09-28',
      near: 'Casita del Pescador',
    });
    expect(service.shortDescription).toContain('Cerca de Casita del Pescador');
    expect(service).not.toHaveProperty('osmId');
    // Los genéricos no se rotulan en el mapa; los nombres propios sí.
    expect(service.mapLabel).toBeUndefined();
    expect(
      osmToParkService({
        id: 'osm-way-2',
        osmId: 'way/2',
        name: 'Casa Remigio',
        named: true,
        type: 'restauracion',
        subtype: 'bar',
        coordinates: [-3.683, 40.4158],
        lastCheckedAt: '2026-09-28',
      }).mapLabel,
    ).toBe('Casa Remigio');
  });

  it('la app recibe curados + OSM sin ids repetidos', () => {
    const ids = services.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(services.length).toBe(
      read('src/data/services.json').length + osmServicesDataset.services.length,
    );
    expect(services.every((s) => s.subtype)).toBe(true);
  });
});

describe('filtros y zoom de los servicios', () => {
  it('agrupa en los chips y cuenta por grupo', () => {
    const counts = countServicesByGroup(services);
    expect(counts.todos).toBe(services.length);
    expect(
      counts.comer + counts.aseos + counts.agua + counts.infantil + counts.deporte + counts.mas,
    ).toBe(services.length);
    const aseos = filterServicesByGroup(services, 'aseos');
    expect(aseos.length).toBe(counts.aseos);
    expect(aseos.every((s) => s.type === 'aseo')).toBe(true);
    expect(filterServicesByGroup(services, 'todos')).toBe(services);
  });

  it('lee el chip de la URL solo si existe', () => {
    expect(parseServiceGroupParam('aseos')).toBe('aseos');
    expect(parseServiceGroupParam('comer')).toBe('comer');
    expect(parseServiceGroupParam('bancos')).toBe('todos');
    expect(parseServiceGroupParam(null)).toBe('todos');
  });

  it('en «Todos» aparecen al acercar: primero comer/aseos/infantil, después agua y deporte', () => {
    const cafe = { type: 'restauracion', subtype: 'cafe' } as ParkService;
    const agua = { type: 'fuente' } as ParkService;
    expect(serviceMinZoom(cafe)).toBe(SERVICE_ZOOM_TIER_A);
    expect(serviceMinZoom(agua)).toBe(SERVICE_ZOOM_TIER_B);
    expect(serviceGroup(agua)).toBe('agua');
    expect(servicesVisibleAtZoom([cafe, agua], 15.2, true)).toEqual([]);
    expect(servicesVisibleAtZoom([cafe, agua], 16, true)).toEqual([cafe]);
    expect(servicesVisibleAtZoom([cafe, agua], 17, true)).toEqual([cafe, agua]);
    // Con el filtro «Servicio» se ven a cualquier zoom.
    expect(servicesVisibleAtZoom([cafe, agua], 14, false)).toEqual([cafe, agua]);
  });

  it('los servicios ceden ante cualquier lugar (también estatuas) en las colisiones', () => {
    const categories = Object.keys(CATEGORY_META) as PlaceCategory[];
    expect(categories).toContain('escultura');
    const lowestPlace = Math.min(...categories.map((category) => placeMarkerPriority(category)));
    expect(lowestPlace).toBeGreaterThan(Math.max(...services.map(serviceMarkerPriority)));
    for (const service of services) {
      expect(serviceMarkerPriority(service)).toBeLessThan(lowestPlace);
    }
  });
});

describe('utilidades de la ficha y del mapa base', () => {
  it('«Cómo llegar» abre la ruta a pie hasta el servicio', () => {
    expect(walkingDirectionsUrl([-3.6839654, 40.4152309])).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=40.415231,-3.683965&travelmode=walking',
    );
  });

  it('oculta los POI de servicio del mapa base solo dentro del parque', () => {
    const boundary: [number, number][][] = [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ];
    const original = ['>=', ['get', 'rank'], 7];
    const filter = withoutParkServicePois(original, boundary) as unknown[];
    expect(filter[0]).toBe('all');
    expect(filter[1]).toBe(original);
    const exclusion = filter[2] as unknown[];
    expect(exclusion[0]).toBe('!');
    expect(JSON.stringify(exclusion)).toContain('"within"');
    expect(JSON.stringify(exclusion)).toContain('"toilets"');
  });
});

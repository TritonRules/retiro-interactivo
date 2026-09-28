import { describe, expect, it } from 'vitest';
import {
  classifyOsmTags,
  dedupeServices,
  formatOpeningHours,
  nearestPlaceName,
  normalizeOsmElement,
  osmIdFromUrl,
  pointInRings,
  ringsFromRelation,
  simplifyRing,
} from './osmServices.shared.mjs';
// @ts-expect-error script Node sin tipos
import { buildServicesDataset } from '../../scripts/services-osm.mjs';
import type { OsmService, ParkService } from '../types/service';

const checkedAt = '2026-09-28';

describe('clasificación de etiquetas OSM', () => {
  it.each([
    [{ amenity: 'toilets' }, 'aseo'],
    [{ amenity: 'drinking_water' }, 'agua'],
    [{ amenity: 'cafe' }, 'cafe'],
    [{ amenity: 'cafe', cuisine: 'ice_cream' }, 'helados'],
    [{ amenity: 'biergarten', name: 'Ángel Caído Heladería' }, 'helados'],
    [{ amenity: 'biergarten', name: 'Galápagos' }, 'bar'],
    [{ amenity: 'restaurant' }, 'restaurante'],
    [{ amenity: 'ice_cream' }, 'helados'],
    [{ shop: 'kiosk' }, 'quiosco'],
    [{ leisure: 'playground' }, 'parque-infantil'],
    [{ leisure: 'fitness_station' }, 'gimnasio'],
    [{ amenity: 'boat_rental' }, 'barcas'],
    [{ shop: 'ticket', name: 'Barcas de remos, entrada' }, 'barcas'],
    [{ tourism: 'information', information: 'office' }, 'informacion'],
    [{ emergency: 'defibrillator' }, 'desfibrilador'],
    [{ leisure: 'dog_park' }, 'zona-canina'],
  ])('%o → %s', (tags, expected) => {
    expect(classifyOsmTags(tags as Record<string, string>)).toBe(expected);
  });

  it('descarta lo que no es un servicio para el visitante', () => {
    expect(classifyOsmTags({ amenity: 'bench' })).toBeNull();
    expect(classifyOsmTags({ amenity: 'waste_basket' })).toBeNull();
    expect(classifyOsmTags({ amenity: 'fountain' })).toBeNull();
    expect(classifyOsmTags({ tourism: 'information', information: 'board' })).toBeNull();
    expect(classifyOsmTags({ leisure: 'pitch', sport: 'tennis' })).toBeNull();
    expect(classifyOsmTags({ shop: 'ticket', name: 'Entradas teatro' })).toBeNull();
    // Aparcabicis solo para clientes.
    expect(classifyOsmTags({ amenity: 'bicycle_parking', access: 'customers' })).toBeNull();
  });
});

describe('normalización', () => {
  it('usa nombre genérico en español y conserva horario, accesibilidad, gratuidad y web', () => {
    const service = normalizeOsmElement(
      {
        type: 'node',
        id: 42,
        lat: 40.4152309,
        lon: -3.6839654,
        tags: {
          amenity: 'toilets',
          fee: 'no',
          wheelchair: 'no',
          opening_hours: 'Mo-Su 10:00-20:00',
          website: 'https://example.org/aseos ; https://otra.example',
        },
      },
      { checkedAt },
    );
    expect(service).toEqual({
      id: 'osm-node-42',
      osmId: 'node/42',
      name: 'Aseos públicos',
      named: false,
      type: 'aseo',
      subtype: 'aseo',
      coordinates: [-3.6839654, 40.4152309],
      lastCheckedAt: checkedAt,
      openingHours: 'Mo-Su 10:00-20:00',
      wheelchair: 'no',
      fee: false,
      website: 'https://example.org/aseos',
    });
  });

  it('toma el centro de las vías, el nombre OSM y la carta si está etiquetada', () => {
    const service = normalizeOsmElement(
      {
        type: 'way',
        id: 7,
        center: { lat: 40.416, lon: -3.68 },
        tags: {
          amenity: 'cafe',
          name: 'Nacional Retiro',
          'website:menu': 'https://example.org/carta',
        },
      },
      { checkedAt },
    );
    expect(service?.id).toBe('osm-way-7');
    expect(service?.name).toBe('Nacional Retiro');
    expect(service?.named).toBe(true);
    expect(service?.coordinates).toEqual([-3.68, 40.416]);
    expect(service?.menuUrl).toBe('https://example.org/carta');
  });

  it('usa la descripción corta como nombre de los gimnasios sin nombre', () => {
    const service = normalizeOsmElement(
      {
        type: 'node',
        id: 1,
        lat: 40.41,
        lon: -3.68,
        tags: { leisure: 'fitness_station', description: 'Zona de calistenia' },
      },
      { checkedAt },
    );
    expect(service?.name).toBe('Zona de calistenia');
  });

  it('ignora URLs que no son http(s) y valores de accesibilidad desconocidos', () => {
    const service = normalizeOsmElement(
      {
        type: 'node',
        id: 2,
        lat: 40.41,
        lon: -3.68,
        tags: { amenity: 'cafe', website: 'www.example.org', wheelchair: 'designated' },
      },
      { checkedAt },
    );
    expect(service?.website).toBeUndefined();
    expect(service?.wheelchair).toBeUndefined();
  });
});

describe('polígono del parque', () => {
  // Cuadrado partido en dos vías, la segunda en sentido contrario.
  const members = [
    {
      type: 'way',
      geometry: [
        { lon: 0, lat: 0 },
        { lon: 1, lat: 0 },
        { lon: 1, lat: 1 },
      ],
    },
    {
      type: 'way',
      geometry: [
        { lon: 0, lat: 0 },
        { lon: 0, lat: 1 },
        { lon: 1, lat: 1 },
      ],
    },
    { type: 'node' },
  ];

  it('une los tramos en un anillo cerrado y distingue dentro/fuera', () => {
    const rings = ringsFromRelation(members);
    expect(rings).toHaveLength(1);
    expect(rings[0][0]).toEqual(rings[0][rings[0].length - 1]);
    expect(pointInRings([0.5, 0.5], rings)).toBe(true);
    expect(pointInRings([1.5, 0.5], rings)).toBe(false);
  });

  it('simplifica sin perder las esquinas', () => {
    const ring: [number, number][] = [
      [0, 0],
      [0.5, 0.000001],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ];
    expect(simplifyRing(ring, 0.001)).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]);
  });
});

describe('deduplicación contra los datos curados', () => {
  const osm = (over: Partial<OsmService>): OsmService => ({
    id: 'osm-node-1',
    osmId: 'node/1',
    name: 'Aseos públicos',
    named: false,
    type: 'aseo',
    subtype: 'aseo',
    coordinates: [-3.6839654, 40.4152309],
    lastCheckedAt: checkedAt,
    ...over,
  });
  const curated = [
    {
      id: 'aseo-estanque',
      type: 'aseo' as const,
      coordinates: [-3.6839654, 40.4152309] as [number, number],
      sourceUrl: 'https://www.openstreetmap.org/node/6504526829',
    },
    {
      id: 'fuente-x',
      type: 'fuente' as const,
      coordinates: [-3.68, 40.416] as [number, number],
      sourceUrl: 'https://www.madrid.es/',
    },
  ];
  const places = [
    {
      id: 'casa-de-vacas',
      name: 'Centro Cultural Casa de Vacas',
      coordinates: [-3.6840988, 40.4192106] as [number, number],
      sourceUrl: 'https://www.madrid.es/',
    },
  ];

  it('lee el id OSM de las URLs', () => {
    expect(osmIdFromUrl('https://www.openstreetmap.org/node/6504526829')).toBe('node/6504526829');
    expect(osmIdFromUrl('https://www.openstreetmap.org/way/28401540')).toBe('way/28401540');
    expect(osmIdFromUrl('https://www.madrid.es/')).toBeNull();
  });

  it('el curado gana por id OSM y se guardan los datos para enriquecerlo', () => {
    const { services, matches } = dedupeServices(
      [
        osm({
          id: 'osm-node-6504526829',
          osmId: 'node/6504526829',
          openingHours: 'Mo-Su 10:00-20:00',
          coordinates: [-3.6, 40.41],
        }),
      ],
      curated,
      places,
    );
    expect(services).toEqual([]);
    expect(matches).toEqual([
      {
        osmId: 'node/6504526829',
        subtype: 'aseo',
        matchedId: 'aseo-estanque',
        matchedKind: 'service',
        reason: 'osm-id',
        enrich: { openingHours: 'Mo-Su 10:00-20:00' },
      },
    ]);
  });

  it('empareja por proximidad solo dentro del mismo grupo', () => {
    const near = osm({ id: 'osm-node-2', osmId: 'node/2', coordinates: [-3.68395, 40.41525] });
    const nearOtherGroup = osm({
      id: 'osm-node-3',
      osmId: 'node/3',
      type: 'restauracion',
      subtype: 'cafe',
      name: 'Kiosko',
      named: true,
      coordinates: [-3.68395, 40.41525],
    });
    const far = osm({ id: 'osm-node-4', osmId: 'node/4', coordinates: [-3.6815, 40.4152309] });
    const { services, matches } = dedupeServices([near, nearOtherGroup, far], curated, places);
    expect(services.map((s) => s.id)).toEqual(['osm-node-3', 'osm-node-4']);
    expect(matches[0]).toMatchObject({
      osmId: 'node/2',
      matchedId: 'aseo-estanque',
      reason: 'proximidad',
    });
  });

  it('descarta el que ya es un lugar con el mismo nombre y aplica las coincidencias manuales', () => {
    const sameName = osm({
      id: 'osm-way-9',
      osmId: 'way/9',
      name: 'Centro cultural Casa de Vacas',
      named: true,
      type: 'informacion',
      subtype: 'informacion',
      coordinates: [-3.6841, 40.41925],
    });
    const manual = osm({ id: 'osm-node-5', osmId: 'node/5', coordinates: [-3.67, 40.41] });
    const { services, matches } = dedupeServices([sameName, manual], curated, places, {
      'node/5': { id: 'fuente-x' },
    });
    expect(services).toEqual([]);
    expect(matches.map((m) => [m.matchedKind, m.matchedId, m.reason])).toEqual([
      ['place', 'casa-de-vacas', 'nombre'],
      ['service', 'fuente-x', 'manual'],
    ]);
  });
});

describe('contexto «Cerca de…»', () => {
  it('usa el lugar reconocible más cercano y no las estatuas', () => {
    const places = [
      {
        name: 'Busto de ejemplo',
        category: 'escultura',
        coordinates: [-3.6801, 40.4151] as [number, number],
      },
      {
        name: 'Palacio de Cristal',
        category: 'iconico',
        coordinates: [-3.681, 40.4145] as [number, number],
      },
    ];
    expect(nearestPlaceName([-3.68, 40.415], places)).toBe('Palacio de Cristal');
    expect(nearestPlaceName([-3.69, 40.42], places)).toBeUndefined();
  });
});

describe('horario en español', () => {
  it.each([
    ['Mo-Su 10:00-20:00', 'lun–dom 10:00–20:00'],
    [
      'Mo-Fr 08:30-21:00; Sa 09:10-17:50; Su off',
      'lun–vie 08:30–21:00 · sáb 09:10–17:50 · dom cerrado',
    ],
    ['PH,Mo-Su 10:00-14:00,15:15-20:30', 'festivos, lun–dom 10:00–14:00, 15:15–20:30'],
    ['24/7', 'Abierto 24 horas'],
    ['PH -1 08:00-24:00', 'PH -1 08:00-24:00'],
    ['', ''],
  ])('%s → %s', (input, expected) => {
    expect(formatOpeningHours(input)).toBe(expected);
  });
});

describe('script services-osm: construcción del conjunto', () => {
  const park = {
    type: 'relation',
    id: 13616929,
    tags: { name: 'Parque del Retiro' },
    members: [
      {
        type: 'way',
        geometry: [
          { lon: -3.69, lat: 40.408 },
          { lon: -3.676, lat: 40.408 },
          { lon: -3.676, lat: 40.422 },
          { lon: -3.69, lat: 40.422 },
          { lon: -3.69, lat: 40.408 },
        ],
      },
    ],
  };
  const raw = {
    osm3s: { timestamp_osm_base: '2026-09-28T06:24:43Z' },
    elements: [
      { type: 'node', id: 10, lat: 40.415, lon: -3.683, tags: { amenity: 'drinking_water' } },
      { type: 'node', id: 10, lat: 40.415, lon: -3.683, tags: { amenity: 'drinking_water' } },
      { type: 'node', id: 11, lat: 40.4154, lon: -3.677, tags: { amenity: 'cafe', name: 'Fuera' } },
      {
        type: 'node',
        id: 12,
        lat: 40.43,
        lon: -3.683,
        tags: { amenity: 'cafe', name: 'Muy fuera' },
      },
      { type: 'node', id: 13, lat: 40.415, lon: -3.683, tags: { amenity: 'bench' } },
      {
        type: 'node',
        id: 6504526829,
        lat: 40.4152309,
        lon: -3.6839654,
        tags: { amenity: 'toilets', fee: 'no' },
      },
      park,
    ],
  };
  const curated = [
    {
      id: 'aseo-estanque',
      type: 'aseo',
      coordinates: [-3.6839654, 40.4152309],
      sourceUrl: 'https://www.openstreetmap.org/node/6504526829',
    },
  ] as unknown as ParkService[];
  const places = [
    { id: 'estanque', name: 'Estanque Grande', coordinates: [-3.6832, 40.4158], area: 'retiro' },
  ];

  it('filtra por el polígono, quita duplicados y da contexto a los genéricos', () => {
    const { dataset, report } = buildServicesDataset(
      { ...raw, elements: raw.elements.map((e) => (e.id === 11 ? { ...e, lon: -3.6755 } : e)) },
      { curated, places, checkedAt },
    );
    expect(dataset.services.map((s: OsmService) => s.id)).toEqual(['osm-node-10']);
    expect(dataset.services[0].near).toBe('Estanque Grande');
    expect(dataset.matches).toHaveLength(1);
    expect(dataset.counts).toMatchObject({ total: 2, added_total: 1, found: { agua: 1, aseo: 1 } });
    expect(report.outside).toEqual(['node/11', 'node/12']);
    expect(dataset.license).toBe('ODbL-1.0');
    expect(dataset.boundary[0].length).toBeGreaterThanOrEqual(4);
  });

  it('falla si la respuesta no trae el contorno del parque', () => {
    expect(() =>
      buildServicesDataset(
        { elements: raw.elements.filter((e) => e !== park) },
        { curated, places, checkedAt },
      ),
    ).toThrow(/geometría del parque/);
  });
});

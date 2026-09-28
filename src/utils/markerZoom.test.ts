import { describe, expect, it } from 'vitest';
import places from '../data/places.json';
import routes from '../data/routes.json';
import services from '../data/services.json';
import type { Place } from '../types/place';
import type { ParkRoute } from '../types/route';
import type { ParkService } from '../types/service';
import {
  applyMarkerZoom,
  applyStopMarkerLayout,
  EVENT_GROUP_RADIUS_METERS,
  eventGroupPriority,
  groupEventsByLocation,
  isHiddenAtZoom,
  MARKER_BASE_SIZE,
  MARKER_MIN_SCALE,
  markerScaleForZoom,
  placeMarkerPriority,
  resolveMarkerCollisions,
  SERVICE_MARKER_PRIORITY,
  spreadOverlappingStops,
  STOP_MARKER_BASE_SIZE,
  STOP_MARKER_GAP,
  STOP_MARKER_MIN_SCALE,
  stopScaleForZoom,
  type CollisionItem,
  type StopMarkerLike,
  USER_MARKER_SIZE,
  type StopPoint,
  type ZoomableMarker,
} from './markerZoom';

/** Proyección Web Mercator en píxeles de pantalla (tesela de 512 px, como MapLibre). */
function project([lon, lat]: [number, number], zoom: number) {
  const worldSize = 512 * 2 ** zoom;
  const x = ((lon + 180) / 360) * worldSize;
  const sin = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize;
  return { x, y };
}

function itemsAt(zoom: number, withServices: boolean, pinnedId?: string): CollisionItem[] {
  // Como el mapa en «Todos»: las estatuas por debajo de su zoom mínimo no se pintan.
  const placeItems = (places as Place[])
    .filter((place) => !isHiddenAtZoom(zoom, place.mapMinZoom, `place:${place.id}` === pinnedId))
    .map((place) => ({
      id: `place:${place.id}`,
      ...project(place.coordinates, zoom),
      priority: placeMarkerPriority(place.category),
      pinned: `place:${place.id}` === pinnedId,
    }));
  const serviceItems = withServices
    ? (services as ParkService[]).map((service) => ({
        id: `service:${service.id}`,
        ...project(service.coordinates, zoom),
        priority: SERVICE_MARKER_PRIORITY,
      }))
    : [];
  return [...placeItems, ...serviceItems];
}

function fullOverlaps(items: CollisionItem[], collapsed: Set<string>, scale: number) {
  const full = items.filter((item) => !collapsed.has(item.id));
  let overlaps = 0;
  for (let i = 0; i < full.length; i += 1) {
    for (let j = i + 1; j < full.length; j += 1) {
      const a = full[i];
      const b = full[j];
      const sa = MARKER_BASE_SIZE * (a.pinned ? 1 : scale);
      const sb = MARKER_BASE_SIZE * (b.pinned ? 1 : scale);
      const min = (sa + sb) / 2;
      if (Math.abs(a.x - b.x) < min && Math.abs(a.y - b.y) < min) overlaps += 1;
    }
  }
  return overlaps;
}

describe('markerScaleForZoom', () => {
  it('encoge los iconos al alejar y los deja a tamaño completo al acercar', () => {
    expect(markerScaleForZoom(13.5)).toBe(MARKER_MIN_SCALE);
    expect(markerScaleForZoom(14)).toBe(MARKER_MIN_SCALE);
    expect(markerScaleForZoom(15)).toBeCloseTo(0.8, 5);
    expect(markerScaleForZoom(16)).toBe(1);
    expect(markerScaleForZoom(19)).toBe(1);
  });

  it('es monótona y tolera valores no finitos', () => {
    let previous = 0;
    for (let zoom = 13; zoom <= 19; zoom += 0.25) {
      const scale = markerScaleForZoom(zoom);
      expect(scale).toBeGreaterThanOrEqual(previous);
      previous = scale;
    }
    expect(markerScaleForZoom(Number.NaN)).toBe(1);
  });
});

describe('resolveMarkerCollisions', () => {
  it('conserva el de mayor prioridad y pliega el resto a punto', () => {
    const collapsed = resolveMarkerCollisions(
      [
        { id: 'servicio', x: 100, y: 100, priority: SERVICE_MARKER_PRIORITY },
        { id: 'iconico', x: 105, y: 100, priority: placeMarkerPriority('iconico') },
        { id: 'lejos', x: 300, y: 300, priority: 1 },
      ],
      1,
    );
    expect([...collapsed]).toEqual(['servicio']);
  });

  it('el seleccionado gana siempre, aunque sea un servicio', () => {
    const collapsed = resolveMarkerCollisions(
      [
        { id: 'iconico', x: 100, y: 100, priority: 100 },
        { id: 'servicio', x: 102, y: 101, priority: SERVICE_MARKER_PRIORITY, pinned: true },
      ],
      0.6,
    );
    expect(collapsed.has('servicio')).toBe(false);
    expect(collapsed.has('iconico')).toBe(true);
  });

  it('es determinista ante empates', () => {
    const items = [
      { id: 'b', x: 0, y: 0, priority: 5 },
      { id: 'a', x: 1, y: 1, priority: 5 },
    ];
    expect([...resolveMarkerCollisions(items, 1)]).toEqual(['b']);
    expect([...resolveMarkerCollisions([...items].reverse(), 1)]).toEqual(['b']);
  });

  it('con los datos reales: sin solapes a vista de parque y casi todo visible de cerca', () => {
    const lejos = itemsAt(14.2, true);
    const scaleLejos = markerScaleForZoom(14.2);
    const plegadosLejos = resolveMarkerCollisions(lejos, scaleLejos);
    expect(fullOverlaps(lejos, plegadosLejos, scaleLejos)).toBe(0);
    // Los lugares icónicos nunca se pliegan.
    for (const place of places as Place[]) {
      if (place.category === 'iconico') expect(plegadosLejos.has(`place:${place.id}`)).toBe(false);
    }

    const cerca = itemsAt(17.5, true);
    const plegadosCerca = resolveMarkerCollisions(cerca, markerScaleForZoom(17.5));
    expect(plegadosCerca.size).toBeLessThan(plegadosLejos.size);
    expect(plegadosCerca.size / cerca.length).toBeLessThan(0.15);
  });

  it('con los datos reales: el lugar seleccionado queda completo a cualquier zoom', () => {
    const target = (places as Place[]).find((place) => place.slug === 'palacio-de-cristal');
    expect(target).toBeDefined();
    for (const zoom of [13.5, 14.2, 15.2, 16.5, 18]) {
      const items = itemsAt(zoom, true, `place:${target!.id}`);
      const collapsed = resolveMarkerCollisions(items, markerScaleForZoom(zoom));
      expect(collapsed.has(`place:${target!.id}`)).toBe(false);
    }
  });
});

describe('estatuas por tramos de zoom', () => {
  const esculturas = (places as Place[]).filter((place) => place.category === 'escultura');

  it('ceden ante monumentos y paseos, pero no ante servicios', () => {
    expect(placeMarkerPriority('escultura')).toBeLessThan(placeMarkerPriority('monumento'));
    expect(placeMarkerPriority('escultura')).toBeLessThan(placeMarkerPriority('paseo'));
    expect(placeMarkerPriority('escultura')).toBeGreaterThan(SERVICE_MARKER_PRIORITY);
  });

  it('isHiddenAtZoom respeta el zoom mínimo salvo en el seleccionado', () => {
    expect(isHiddenAtZoom(15.2, 16)).toBe(true);
    expect(isHiddenAtZoom(16, 16)).toBe(false);
    expect(isHiddenAtZoom(15.2, 16, true)).toBe(false);
    expect(isHiddenAtZoom(13.5, undefined)).toBe(false);
    expect(isHiddenAtZoom(Number.NaN, 16)).toBe(false);
  });

  it('todas las estatuas tienen zoom mínimo y aparecen de forma progresiva', () => {
    expect(esculturas.length).toBeGreaterThanOrEqual(30);
    for (const place of esculturas) {
      expect(place.mapMinZoom, place.id).toBeGreaterThanOrEqual(15);
    }
    const visibles = (zoom: number) =>
      esculturas.filter((place) => !isHiddenAtZoom(zoom, place.mapMinZoom)).length;
    expect(visibles(14.2)).toBe(0);
    expect(visibles(15.2)).toBeGreaterThan(0);
    expect(visibles(15.2)).toBeLessThan(visibles(16.5));
    expect(visibles(16.5)).toBeLessThan(visibles(17.5));
    expect(visibles(17.5)).toBe(esculturas.length);
    // Los reyes del Paseo de las Estatuas, muy juntos, solo de cerca.
    for (const place of esculturas.filter(
      (p) => p.tags.includes('reyes') && p.id !== 'estatua-juana-i',
    )) {
      expect(place.mapMinZoom, place.id).toBeGreaterThanOrEqual(17);
    }
  });

  it('a vista de parque (15,2) las estatuas no pliegan a ningún lugar mayor', () => {
    const items = itemsAt(15.2, false);
    const collapsed = resolveMarkerCollisions(items, markerScaleForZoom(15.2));
    for (const place of places as Place[]) {
      if (place.category === 'iconico' || place.category === 'monumento') {
        const rivals = items.filter(
          (item) =>
            item.id !== `place:${place.id}` &&
            item.id.startsWith('place:') &&
            (places as Place[]).find((p) => `place:${p.id}` === item.id)?.category === 'escultura',
        );
        // Si un monumento se pliega, no es por culpa de una estatua (tienen menos prioridad).
        if (collapsed.has(`place:${place.id}`)) {
          const withoutStatues = items.filter((item) => !rivals.includes(item));
          expect(
            resolveMarkerCollisions(withoutStatues, markerScaleForZoom(15.2)).has(
              `place:${place.id}`,
            ),
            place.id,
          ).toBe(true);
        }
      }
    }
  });
});

describe('applyMarkerZoom', () => {
  function fakeElement() {
    const classes = new Set<string>();
    const attrs: Record<string, string> = {};
    return {
      attrs,
      dataset: {} as Record<string, string>,
      classList: {
        toggle: (name: string, force: boolean) =>
          force ? classes.add(name) : classes.delete(name),
        has: (name: string) => classes.has(name),
      },
      setAttribute: (k: string, v: string) => (attrs[k] = v),
      removeAttribute: (k: string) => delete attrs[k],
    };
  }

  it('fija --marker-scale en el contenedor y marca el estado de cada icono', () => {
    const props: Record<string, string> = {};
    const container = { style: { setProperty: (k: string, v: string) => (props[k] = v) } };
    const a = fakeElement();
    const b = fakeElement();
    const markers = [
      { id: 'a', element: a, lngLat: [0, 0], priority: 100 },
      { id: 'b', element: b, lngLat: [0, 0], priority: 10 },
    ] as unknown as ZoomableMarker[];
    applyMarkerZoom(
      {
        getZoom: () => 14,
        getContainer: () => container as unknown as HTMLElement,
        project: () => ({ x: 50, y: 50 }),
      },
      markers,
    );
    expect(props['--marker-scale']).toBe(String(MARKER_MIN_SCALE));
    expect(a.dataset.markerState).toBe('full');
    expect(b.dataset.markerState).toBe('dot');
    expect(b.classList.has('is-dot')).toBe(true);
  });

  it('oculta los iconos por debajo de su zoom mínimo y no los cuenta en las colisiones', () => {
    const container = { style: { setProperty: () => {} } };
    const statue = fakeElement();
    const other = fakeElement();
    const pinned = fakeElement();
    const markers = [
      { id: 'estatua', element: statue, lngLat: [0, 0], priority: 100, minZoom: 16 },
      { id: 'lugar', element: other, lngLat: [0, 0], priority: 10 },
      { id: 'fijada', element: pinned, lngLat: [5, 5], priority: 1, minZoom: 17, pinned: true },
    ] as unknown as ZoomableMarker[];
    const map = (zoom: number) => ({
      getZoom: () => zoom,
      getContainer: () => container as unknown as HTMLElement,
      project: ([x]: [number, number]) => ({ x: x * 100, y: x * 100 }),
    });
    applyMarkerZoom(map(15), markers);
    expect(statue.dataset.markerState).toBe('hidden');
    expect(statue.classList.has('is-hidden')).toBe(true);
    // Sin la estatua (oculta) el otro icono no se pliega.
    expect(other.dataset.markerState).toBe('full');
    expect(pinned.dataset.markerState).toBe('full');

    applyMarkerZoom(map(16.5), markers);
    expect(statue.dataset.markerState).toBe('full');
    expect(statue.classList.has('is-hidden')).toBe(false);
    expect(other.dataset.markerState).toBe('dot');
  });
});

describe('servicios ocultos por zoom', () => {
  function fakeElement() {
    const classes = new Set<string>();
    const attrs: Record<string, string> = {};
    return {
      attrs,
      dataset: {} as Record<string, string>,
      classList: {
        toggle: (name: string, force: boolean) =>
          force ? classes.add(name) : classes.delete(name),
        has: (name: string) => classes.has(name),
      },
      setAttribute: (k: string, v: string) => (attrs[k] = v),
      removeAttribute: (k: string) => delete attrs[k],
    };
  }

  it('un servicio oculto no ocupa sitio ni pliega a otro; al acercar vuelve', () => {
    const container = {
      style: { setProperty: () => undefined },
      dataset: {} as Record<string, string>,
    };
    const place = fakeElement();
    const service = fakeElement();
    const markers = [
      { id: 'service', element: service, lngLat: [0, 0], priority: 200, minZoom: 15.5 },
      { id: 'place', element: place, lngLat: [0, 0], priority: 10 },
    ] as unknown as ZoomableMarker[];
    let zoom = 15;
    const map = {
      getZoom: () => zoom,
      getContainer: () => container as unknown as HTMLElement,
      project: () => ({ x: 50, y: 50 }),
    };
    applyMarkerZoom(map, markers);
    expect(service.dataset.markerState).toBe('hidden');
    expect(service.classList.has('is-hidden')).toBe(true);
    expect(service.attrs['aria-hidden']).toBe('true');
    expect(place.dataset.markerState).toBe('full');

    expect(container.dataset.markerLabels).toBe('false');
    zoom = 17;
    applyMarkerZoom(map, markers);
    expect(container.dataset.markerLabels).toBe('true');
    expect(service.dataset.markerState).toBe('full');
    expect(service.attrs['aria-hidden']).toBeUndefined();
    expect(service.classList.has('is-hidden')).toBe(false);
  });
});

describe('eventos en el mapa', () => {
  const CASA_DE_VACAS: [number, number] = [-3.6840988, 40.4192106];
  const TITERES: [number, number] = [-3.6866962, 40.4187197];
  const ev = (id: string, coordinates: [number, number]) => ({ id, coordinates });

  it('agrupa los eventos de la misma sede conservando el orden', () => {
    const groups = groupEventsByLocation([
      ev('a', CASA_DE_VACAS),
      ev('b', TITERES),
      ev('c', CASA_DE_VACAS),
      // ~11 m al norte de Casa de Vacas: misma sede.
      ev('d', [CASA_DE_VACAS[0], CASA_DE_VACAS[1] + 0.0001]),
    ]);
    expect(groups.map((g) => g.events.map((e) => e.id))).toEqual([['a', 'c', 'd'], ['b']]);
    expect(groups[0].id).toBe('events:a');
    expect(groups[0].coordinates).toEqual(CASA_DE_VACAS);
  });

  it('no agrupa sedes distintas aunque estén cerca', () => {
    // ~45 m: por encima del radio de agrupación.
    const groups = groupEventsByLocation([
      ev('a', CASA_DE_VACAS),
      ev('b', [CASA_DE_VACAS[0], CASA_DE_VACAS[1] + 0.0004]),
    ]);
    expect(EVENT_GROUP_RADIUS_METERS).toBeLessThan(45);
    expect(groups).toHaveLength(2);
    expect(groupEventsByLocation([])).toEqual([]);
  });

  it('los eventos ganan a cualquier lugar; un grupo mayor gana a uno menor', () => {
    expect(eventGroupPriority(1)).toBeGreaterThan(placeMarkerPriority('iconico'));
    expect(eventGroupPriority(3)).toBeGreaterThan(eventGroupPriority(1));
    expect(eventGroupPriority(40)).toBe(eventGroupPriority(9));
    expect(eventGroupPriority(0)).toBe(eventGroupPriority(1));
  });

  it('un evento sobre un lugar lo pliega a punto; el lugar seleccionado gana', () => {
    const at = project(CASA_DE_VACAS, 16);
    const items: CollisionItem[] = [
      { id: 'place:casa-de-vacas', ...at, priority: placeMarkerPriority('cultura') },
      { id: 'events:a', ...at, priority: eventGroupPriority(9) },
    ];
    expect([...resolveMarkerCollisions(items, 1)]).toEqual(['place:casa-de-vacas']);
    items[0].pinned = true;
    expect([...resolveMarkerCollisions(items, 1)]).toEqual(['events:a']);
  });
});

describe('paradas numeradas', () => {
  const size = (scale: number) => STOP_MARKER_BASE_SIZE * scale;

  function overlappingPairs(
    points: StopPoint[],
    offsets: { dx: number; dy: number }[],
    scale: number,
  ) {
    const pairs: string[] = [];
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const si = points[i].pinned ? STOP_MARKER_BASE_SIZE : size(scale);
        const sj = points[j].pinned ? STOP_MARKER_BASE_SIZE : size(scale);
        const d = Math.hypot(
          points[i].x + offsets[i].dx - points[j].x - offsets[j].dx,
          points[i].y + offsets[i].dy - points[j].y - offsets[j].dy,
        );
        if (d < (si + sj) / 2 - 0.5) pairs.push(`${i + 1}-${j + 1}`);
      }
    }
    return pairs;
  }

  it('encogen menos que los iconos y nunca por debajo del mínimo', () => {
    expect(stopScaleForZoom(13.5)).toBe(STOP_MARKER_MIN_SCALE);
    expect(stopScaleForZoom(14)).toBe(STOP_MARKER_MIN_SCALE);
    expect(stopScaleForZoom(15)).toBeCloseTo(0.9, 5);
    expect(stopScaleForZoom(16)).toBe(1);
    expect(stopScaleForZoom(18)).toBe(1);
    expect(stopScaleForZoom(Number.NaN)).toBe(1);
    for (let zoom = 13; zoom <= 19; zoom += 0.25) {
      expect(stopScaleForZoom(zoom)).toBeGreaterThanOrEqual(markerScaleForZoom(zoom));
    }
  });

  it('no mueve las paradas que no se solapan', () => {
    const offsets = spreadOverlappingStops(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      1,
    );
    expect(offsets).toEqual([
      { dx: 0, dy: 0 },
      { dx: 0, dy: 0 },
    ]);
  });

  it('separa dos paradas solapadas hasta que se tocan, a partes iguales', () => {
    const points = [
      { x: 100, y: 100 },
      { x: 110, y: 100 },
    ];
    const offsets = spreadOverlappingStops(points, 0.8);
    expect(overlappingPairs(points, offsets, 0.8)).toEqual([]);
    expect(offsets[0].dx).toBeLessThan(0);
    expect(offsets[1].dx).toBeGreaterThan(0);
    expect(offsets[0].dx).toBeCloseTo(-offsets[1].dx, 1);
    const gap = points[1].x + offsets[1].dx - (points[0].x + offsets[0].dx);
    expect(gap).toBeCloseTo(size(0.8) + STOP_MARKER_GAP, 0);
  });

  it('separa paradas en el mismo punto y no mueve la fijada', () => {
    const points = [
      { x: 50, y: 50, pinned: true },
      { x: 50, y: 50 },
    ];
    const offsets = spreadOverlappingStops(points, 0.8);
    expect(offsets[0]).toEqual({ dx: 0, dy: 0 });
    expect(Math.hypot(offsets[1].dx, offsets[1].dy)).toBeGreaterThan(20);
    expect(overlappingPairs(points, offsets, 0.8)).toEqual([]);
  });

  it('el punto del usuario aparta a las paradas, también a la siguiente del paseo', () => {
    // Caso del paseo a poco zoom: el usuario entre la parada visitada y la siguiente.
    const points: StopPoint[] = [
      { x: 116, y: 100, pinned: true },
      { x: 96, y: 101 },
      { x: 108, y: 100, obstacle: true, size: USER_MARKER_SIZE },
    ];
    const offsets = spreadOverlappingStops(points, 0.8);
    // El obstáculo no se mueve.
    expect(offsets[2]).toEqual({ dx: 0, dy: 0 });
    for (const i of [0, 1]) {
      const size = points[i].pinned ? STOP_MARKER_BASE_SIZE : STOP_MARKER_BASE_SIZE * 0.8;
      const d = Math.hypot(points[i].x + offsets[i].dx - 108, points[i].y + offsets[i].dy - 100);
      expect(d).toBeGreaterThanOrEqual((size + USER_MARKER_SIZE) / 2 - 0.5);
    }
    // Entre paradas, la fijada sigue sin ceder ante la no fijada.
    expect(overlappingPairs(points.slice(0, 2), offsets.slice(0, 2), 0.8)).toEqual([]);
  });

  it('limita el desplazamiento para no alejar la parada de su sitio', () => {
    const points = Array.from({ length: 6 }, () => ({ x: 0, y: 0 }));
    const offsets = spreadOverlappingStops(points, 1, { maxOffset: 20 });
    for (const { dx, dy } of offsets) expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(20.1);
  });

  it('con los datos reales: todos los números legibles a cualquier zoom', () => {
    const byId = new Map((places as Place[]).map((place) => [place.id, place]));
    for (const route of routes as ParkRoute[]) {
      for (const zoom of [13.5, 14, 14.5, 15, 15.5, 16, 16.5]) {
        const scale = stopScaleForZoom(zoom);
        const points = route.stopIds.map((id) => project(byId.get(id)!.coordinates, zoom));
        const offsets = spreadOverlappingStops(points, scale);
        expect(overlappingPairs(points, offsets, scale), `${route.slug} @ ${zoom}`).toEqual([]);
        for (const { dx, dy } of offsets) {
          expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(STOP_MARKER_BASE_SIZE + 0.1);
        }
      }
    }
  });

  it('applyStopMarkerLayout fija --stop-scale y separa con offset de MapLibre', () => {
    const props: Record<string, string> = {};
    const container = { style: { setProperty: (k: string, v: string) => (props[k] = v) } };
    const offsets: [number, number][] = [];
    const stop = (index: number, classes: string[] = []): StopMarkerLike => {
      const element = {
        dataset: {} as Record<string, string>,
        classList: { contains: (name: string) => classes.includes(name) },
      };
      return {
        getElement: () => element as unknown as HTMLElement,
        getLngLat: () => ({ lng: index, lat: 0 }),
        setOffset: (offset: [number, number]) => {
          offsets[index] = offset;
        },
      };
    };
    const stops = [stop(0, ['is-next']), stop(1)];
    applyStopMarkerLayout(
      {
        getZoom: () => 14,
        getContainer: () => container as unknown as HTMLElement,
        project: ([lng]) => ({ x: 100 + lng * 5, y: 100 }),
      },
      stops,
    );
    expect(props['--stop-scale']).toBe(String(STOP_MARKER_MIN_SCALE));
    // La siguiente parada del paseo no se mueve; la otra se aparta.
    expect(offsets[0]).toEqual([0, 0]);
    expect(offsets[1][0]).toBeGreaterThan(0);
    expect(stops[0].getElement().dataset.stopShifted).toBe('false');
    expect(stops[1].getElement().dataset.stopShifted).toBe('true');
  });

  it('applyStopMarkerLayout aparta las paradas del punto del usuario', () => {
    const container = { style: { setProperty: () => {} } };
    let offset: [number, number] = [0, 0];
    const element = { dataset: {} as Record<string, string>, classList: { contains: () => false } };
    const stop: StopMarkerLike = {
      getElement: () => element as unknown as HTMLElement,
      getLngLat: () => ({ lng: 0, lat: 0 }),
      setOffset: (next: [number, number]) => {
        offset = next;
      },
    };
    const map = {
      getZoom: () => 16,
      getContainer: () => container as unknown as HTMLElement,
      project: ([lng]: [number, number]) => ({ x: 100 + lng, y: 100 }),
    };
    applyStopMarkerLayout(map, [stop]);
    expect(offset).toEqual([0, 0]);
    applyStopMarkerLayout(map, [stop], [4, 0]);
    expect(offset[0]).toBeLessThan(-20);
    expect(element.dataset.stopShifted).toBe('true');
  });
});

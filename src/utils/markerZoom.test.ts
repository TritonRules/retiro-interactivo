import { describe, expect, it } from 'vitest';
import places from '../data/places.json';
import services from '../data/services.json';
import type { Place } from '../types/place';
import type { ParkService } from '../types/service';
import {
  applyMarkerZoom,
  MARKER_BASE_SIZE,
  MARKER_MIN_SCALE,
  markerScaleForZoom,
  placeMarkerPriority,
  resolveMarkerCollisions,
  SERVICE_MARKER_PRIORITY,
  type CollisionItem,
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
  const placeItems = (places as Place[]).map((place) => ({
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

describe('applyMarkerZoom', () => {
  function fakeElement() {
    const classes = new Set<string>();
    return {
      dataset: {} as Record<string, string>,
      classList: {
        toggle: (name: string, force: boolean) => (force ? classes.add(name) : classes.delete(name)),
        has: (name: string) => classes.has(name),
      },
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
});

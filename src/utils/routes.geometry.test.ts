import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import agua from './__fixtures__/park-water.json';

type Coord = [number, number];

const routes = JSON.parse(
  readFileSync(join(process.cwd(), 'src/data/routes.json'), 'utf8'),
) as Array<{
  slug: string;
  circular: boolean;
  stopIds: string[];
  approximateDistanceMeters: number;
  geometry: { type: string; coordinates: Coord[] };
}>;

const places = JSON.parse(
  readFileSync(join(process.cwd(), 'src/data/places.json'), 'utf8'),
) as Array<{ id: string; name: string; coordinates: Coord }>;
const placeById = new Map(places.map((place) => [place.id, place]));

const EARTH = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

function metros([lon1, lat1]: Coord, [lon2, lat2]: Coord): number {
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 2 * EARTH * Math.asin(Math.sqrt(a));
}

/** Distancia de un punto al segmento y posición relativa dentro de él. */
function alSegmento(point: Coord, a: Coord, b: Coord): { distancia: number; t: number } {
  const scale = Math.cos(toRad(point[1]));
  const proyectar = ([lon, lat]: Coord): [number, number] => [lon * scale * 111320, lat * 110540];
  const [px, py] = proyectar(point);
  const [ax, ay] = proyectar(a);
  const [bx, by] = proyectar(b);
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return { distancia: Math.hypot(px - ax, py - ay), t: 0 };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return { distancia: Math.hypot(px - (ax + t * dx), py - (ay + t * dy)), t };
}

function dentroDelPoligono([lon, lat]: Coord, ring: number[][]): boolean {
  let dentro = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

function seCruzan(p1: Coord, p2: Coord, p3: number[], p4: number[]): boolean {
  const lado = (a: number[], b: number[], c: number[]) => {
    const v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    return Math.abs(v) < 1e-14 ? 0 : Math.sign(v);
  };
  return lado(p1, p2, p3) !== lado(p1, p2, p4) && lado(p3, p4, p1) !== lado(p3, p4, p2);
}

/** Primera posición del trazado, a partir de `desde`, que pasa cerca del punto. */
function posicionCercana(coords: Coord[], point: Coord, desde: number, radio: number) {
  let mejor: { posicion: number; distancia: number } | null = null;
  for (let i = Math.max(0, Math.floor(desde)); i < coords.length - 1; i += 1) {
    const { distancia, t } = alSegmento(point, coords[i], coords[i + 1]);
    if (distancia <= radio) return { posicion: i + t, distancia };
    if (!mejor || distancia < mejor.distancia) mejor = { posicion: i + t, distancia };
  }
  return mejor;
}

/** Tolerancia: los centroides de estanques o explanadas quedan lejos del paseo. */
const RADIO_PARADA = 60;

describe('geometría caminable de las rutas', () => {
  it.each(routes.map((route) => [route.slug, route] as const))(
    '%s traza una línea continua por el parque',
    (_slug, route) => {
      const coords = route.geometry.coordinates;
      expect(route.geometry.type).toBe('LineString');
      expect(coords.length).toBeGreaterThanOrEqual(2);

      for (const [lon, lat] of coords) {
        expect(lon).toBeGreaterThan(-3.6935);
        expect(lon).toBeLessThan(-3.6715);
        expect(lat).toBeGreaterThan(40.4075);
        expect(lat).toBeLessThan(40.4255);
      }

      for (let i = 0; i < coords.length - 1; i += 1) {
        const salto = metros(coords[i], coords[i + 1]);
        // Sin vértices repetidos y sin saltos que delaten un tramo inventado.
        expect.soft(salto, `vértice ${i} de ${route.slug}`).toBeGreaterThan(0);
        expect.soft(salto, `vértice ${i} de ${route.slug}`).toBeLessThan(450);
      }
    },
  );

  it.each(routes.map((route) => [route.slug, route] as const))(
    '%s pasa por todas sus paradas en orden',
    (_slug, route) => {
      const coords = route.geometry.coordinates;
      const primera = placeById.get(route.stopIds[0])!;
      const ultima = placeById.get(route.stopIds[route.stopIds.length - 1])!;

      expect(metros(coords[0], primera.coordinates)).toBeLessThanOrEqual(RADIO_PARADA);
      const cierre = route.circular ? primera : ultima;
      expect(metros(coords[coords.length - 1], cierre.coordinates)).toBeLessThanOrEqual(
        RADIO_PARADA,
      );

      let posicion = 0;
      for (const id of route.stopIds) {
        const parada = placeById.get(id)!;
        const encontrada = posicionCercana(coords, parada.coordinates, posicion, RADIO_PARADA);
        expect
          .soft(encontrada?.distancia ?? Infinity, `${route.slug} → ${parada.name}`)
          .toBeLessThanOrEqual(RADIO_PARADA);
        posicion = encontrada?.posicion ?? posicion;
      }
    },
  );

  it.each(routes.map((route) => [route.slug, route] as const))(
    '%s no atraviesa las láminas de agua',
    (_slug, route) => {
      const coords = route.geometry.coordinates;
      for (const { name, ring } of agua.polygons) {
        for (let i = 0; i < coords.length - 1; i += 1) {
          const a = coords[i];
          const b = coords[i + 1];
          const cruza =
            dentroDelPoligono(a, ring) ||
            dentroDelPoligono(b, ring) ||
            ring.some((_, j) => j < ring.length - 1 && seCruzan(a, b, ring[j], ring[j + 1]));
          expect.soft(cruza, `${route.slug} cruza ${name} en el vértice ${i}`).toBe(false);
        }
      }
    },
  );

  it.each(routes.map((route) => [route.slug, route] as const))(
    '%s declara una distancia coherente con su trazado',
    (_slug, route) => {
      const coords = route.geometry.coordinates;
      const longitud = coords.reduce(
        (total, punto, index) => (index === 0 ? 0 : total + metros(coords[index - 1], punto)),
        0,
      );
      expect(route.approximateDistanceMeters).toBeGreaterThan(longitud * 0.9);
      expect(route.approximateDistanceMeters).toBeLessThan(longitud * 1.1);
    },
  );
});

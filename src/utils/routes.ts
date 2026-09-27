import routesData from '../data/routes.json';
import videoFixtures from '../../e2e/fixtures/videos.json';
import type { ParkRoute } from '../types/route';
import { places } from './places';
import { validateRoutes } from './validateRoutes';

const placeIds = new Set(places.map((place) => place.id));
/** Build e2e: añade vídeos de prueba sin tocar los datos reales. */
function withFixtureVideos(list: unknown[]): unknown[] {
  if (import.meta.env.PUBLIC_E2E_FIXTURE !== '1') return list;
  const byId: Record<string, unknown[]> = videoFixtures.routes;
  return list.map((item) => {
    const route = item as { id: string };
    return byId[route.id] ? { ...route, videos: byId[route.id] } : route;
  });
}

const result = validateRoutes(withFixtureVideos(routesData), placeIds);

if (!result.ok) {
  throw new Error(
    `Datos de rutas inválidos:\n${result.errors.map((e) => `- ${e}`).join('\n')}`,
  );
}

export const routes: ParkRoute[] = result.routes;

export function getRouteBySlug(slug: string): ParkRoute | undefined {
  return routes.find((route) => route.slug === slug);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `~${meters} m`;
  return `~${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `~${h} h` : `~${h} h ${m} min`;
}

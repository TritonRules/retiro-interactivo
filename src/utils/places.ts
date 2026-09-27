import placesData from '../data/places.json';
import videoFixtures from '../../e2e/fixtures/videos.json';
import type { Place } from '../types/place';
import { validatePlaces } from './validatePlaces';

/** Build e2e: añade vídeos de prueba sin tocar los datos reales. */
function withFixtureVideos(list: unknown[]): unknown[] {
  if (import.meta.env.PUBLIC_E2E_FIXTURE !== '1') return list;
  const byId: Record<string, unknown[]> = videoFixtures.places;
  return list.map((item) => {
    const place = item as { id: string };
    return byId[place.id] ? { ...place, videos: byId[place.id] } : place;
  });
}

const result = validatePlaces(withFixtureVideos(placesData));

if (!result.ok) {
  throw new Error(
    `Datos de lugares inválidos:\n${result.errors.map((e) => `- ${e}`).join('\n')}`,
  );
}

export const places: Place[] = result.places;

export function getPlaceBySlug(slug: string): Place | undefined {
  return places.find((place) => place.slug === slug);
}

export function placesToGeoJSON(list: Place[] = places) {
  return {
    type: 'FeatureCollection' as const,
    features: list.map((place) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: place.coordinates,
      },
      properties: {
        id: place.id,
        slug: place.slug,
        name: place.name,
        category: place.category,
        status: place.status,
      },
    })),
  };
}

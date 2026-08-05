import placesData from '../data/places.json';
import type { Place } from '../types/place';
import { validatePlaces } from './validatePlaces';

const result = validatePlaces(placesData);

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

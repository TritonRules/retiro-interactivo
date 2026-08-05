import type { Place } from '../types/place';
import type { ParkService } from '../types/service';
import { formatDistance, haversineMeters } from './geo';

export type NearbyKind = 'place' | 'service';

export interface NearbyItem {
  id: string;
  name: string;
  kind: NearbyKind;
  categoryLabel: string;
  coordinates: [number, number];
  meters: number;
  distanceLabel: string;
  href?: string;
}

export function nearestItems(
  origin: [number, number],
  places: Place[],
  servicesList: ParkService[],
  limit = 5,
  getCategoryLabel: (place: Place) => string,
  getServiceLabel: (service: ParkService) => string,
  placeHref: (place: Place) => string,
): NearbyItem[] {
  const placeItems: NearbyItem[] = places.map((place) => {
    const meters = haversineMeters(origin, place.coordinates);
    return {
      id: place.id,
      name: place.name,
      kind: 'place',
      categoryLabel: getCategoryLabel(place),
      coordinates: place.coordinates,
      meters,
      distanceLabel: formatDistance(meters),
      href: placeHref(place),
    };
  });

  const serviceItems: NearbyItem[] = servicesList.map((service) => {
    const meters = haversineMeters(origin, service.coordinates);
    return {
      id: service.id,
      name: service.name,
      kind: 'service',
      categoryLabel: getServiceLabel(service),
      coordinates: service.coordinates,
      meters,
      distanceLabel: formatDistance(meters),
    };
  });

  return [...placeItems, ...serviceItems]
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit);
}

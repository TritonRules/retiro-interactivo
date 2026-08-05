import servicesData from '../data/services.json';
import type { ParkService } from '../types/service';
import { validateServices } from './validateServices';

const result = validateServices(servicesData);

if (!result.ok) {
  throw new Error(
    `Datos de servicios inválidos:\n${result.errors.map((e) => `- ${e}`).join('\n')}`,
  );
}

export const services: ParkService[] = result.services;

export function servicesToGeoJSON(list: ParkService[] = services) {
  return {
    type: 'FeatureCollection' as const,
    features: list.map((service) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: service.coordinates,
      },
      properties: {
        id: service.id,
        name: service.name,
        type: service.type,
        status: service.status,
        kind: 'service' as const,
      },
    })),
  };
}

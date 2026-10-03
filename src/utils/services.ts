import servicesData from '../data/services.json';
import osmData from '../data/services-osm.json';
import infoData from '../data/services-info.json';
import type { OsmService, ParkService } from '../types/service';
import {
  osmServicesDatasetSchema,
  SERVICE_SUBTYPES,
  SUBTYPE_BY_TYPE,
  type OsmServicesDataset,
  type ServiceMatch,
} from './osmServices.shared.mjs';
import { validateServices } from './validateServices';
import { serviceInfoDatasetSchema, type ServiceInfo } from './serviceInfo.shared.mjs';

const result = validateServices(servicesData);

if (!result.ok) {
  throw new Error(
    `Datos de servicios inválidos:\n${result.errors.map((e) => `- ${e}`).join('\n')}`,
  );
}

const osmParsed = osmServicesDatasetSchema.safeParse(osmData);
if (!osmParsed.success) {
  throw new Error(
    `services-osm.json inválido:\n${osmParsed.error.issues
      .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')}`,
  );
}

/** Metadatos de la extracción OSM (atribución, fecha, contorno del parque). */
export const osmServicesDataset: OsmServicesDataset = osmParsed.data;

/** Descripción breve de un servicio OSM (los nombres genéricos llevan el lugar cercano). */
export function osmServiceDescription(service: OsmService): string {
  const where = service.near ? `Cerca de ${service.near}. ` : '';
  return `${where}${SERVICE_SUBTYPES[service.subtype].label} según OpenStreetMap; puede haber cambios recientes.`;
}

/** Convierte un elemento de services-osm.json en un servicio de la app. */
export function osmToParkService(service: OsmService): ParkService {
  const { osmId, lastCheckedAt, named, osmCheckDate: _check, ...rest } = service;
  return {
    ...rest,
    ...(named ? { mapLabel: service.name } : {}),
    origin: 'osm',
    shortDescription: osmServiceDescription(service),
    sourceName: `OpenStreetMap (${osmId})`,
    sourceUrl: `https://www.openstreetmap.org/${osmId}`,
    lastVerifiedAt: lastCheckedAt,
    status: 'verified',
  };
}

/**
 * Une servicios curados y OSM. El curado gana siempre; si OSM lo tiene, se completan
 * los campos que falten (horario, accesibilidad, gratuidad, web).
 */
export function mergeServices(
  curated: ParkService[],
  osmServices: OsmService[],
  matches: ServiceMatch[] = [],
): ParkService[] {
  const enrichById = new Map<string, NonNullable<ServiceMatch['enrich']>>();
  for (const match of matches) {
    if (match.matchedKind !== 'service' || !match.enrich) continue;
    enrichById.set(match.matchedId, { ...match.enrich, ...enrichById.get(match.matchedId) });
  }
  const curatedIds = new Set(curated.map((service) => service.id));
  const merged: ParkService[] = curated.map((service) => ({
    ...enrichById.get(service.id),
    ...service,
    subtype: service.subtype ?? SUBTYPE_BY_TYPE[service.type],
    ...(service.type === 'restauracion' ? { mapLabel: service.name } : {}),
    origin: 'curated',
  }));
  for (const service of osmServices) {
    if (curatedIds.has(service.id)) continue;
    merged.push(osmToParkService(service));
  }
  return merged;
}

const infoParsed = serviceInfoDatasetSchema.safeParse(infoData);
if (!infoParsed.success) {
  throw new Error(
    `services-info.json inválido:\n${infoParsed.error.issues
      .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')}`,
  );
}

/** Información verificada de los locales (teléfono, horario, precios, estado). */
export const serviceInfoList: ServiceInfo[] = infoParsed.data.services;

/**
 * Añade a cada servicio su información verificada. El nombre comercial y la web/carta
 * verificados sustituyen a los de OSM; el horario se muestra desde `info.hours`.
 */
export function applyServiceInfo(list: ParkService[], infoList: ServiceInfo[]): ParkService[] {
  const byId = new Map(infoList.map((info) => [info.id, info]));
  return list.map((service) => {
    const info = byId.get(service.id);
    if (!info) return service;
    const name = info.name ?? service.name;
    return {
      ...service,
      name,
      ...(service.mapLabel ? { mapLabel: name } : {}),
      ...(info.website ? { website: info.website } : {}),
      ...(info.menuUrl ? { menuUrl: info.menuUrl } : {}),
      info,
    };
  });
}

/** Servicios curados (services.json) + servicios OSM nuevos (services-osm.json). */
export const services: ParkService[] = applyServiceInfo(
  mergeServices(result.services, osmServicesDataset.services, osmServicesDataset.matches),
  serviceInfoList,
);

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

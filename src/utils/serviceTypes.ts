import type { ParkService, ServiceGroup, ServiceSubtype, ServiceType } from '../types/service';
import { SERVICE_GROUPS, SERVICE_SUBTYPES, SUBTYPE_BY_TYPE } from './osmServices.shared.mjs';

export { SERVICE_GROUPS, SERVICE_SUBTYPES };

export const SERVICE_TYPE_META: Record<
  ServiceType,
  { label: string; glyph: string; color: string }
> = {
  aseo: { label: 'Aseo', glyph: 'WC', color: '#9A2E68' },
  fuente: { label: 'Agua potable', glyph: '💧', color: '#1C6690' },
  'zona-infantil': { label: 'Zona infantil', glyph: '◇', color: '#8A5A00' },
  acceso: { label: 'Acceso', glyph: '⊓', color: '#8B4513' },
  informacion: { label: 'Información', glyph: 'i', color: '#4B5563' },
  restauracion: { label: 'Restauración', glyph: '◌', color: '#B4451F' },
  deporte: { label: 'Deporte', glyph: '▣', color: '#0F6E6E' },
  otros: { label: 'Otros', glyph: '·', color: '#4B5563' },
};

export interface ServiceGroupMeta {
  label: string;
  /** Color del pictograma (texto blanco encima: contraste ≥ 4,5:1). */
  color: string;
  /** Prioridad en las colisiones: siempre por debajo de cualquier lugar (acceso = 30). */
  priority: number;
}

export const SERVICE_GROUP_META: Record<ServiceGroup, ServiceGroupMeta> = {
  comer: { label: 'Comer y beber', color: '#B4451F', priority: 16 },
  aseos: { label: 'Aseos', color: '#9A2E68', priority: 15 },
  infantil: { label: 'Parques infantiles', color: '#8A5A00', priority: 14 },
  agua: { label: 'Agua', color: '#1C6690', priority: 11 },
  deporte: { label: 'Deporte', color: '#0F6E6E', priority: 11 },
  mas: { label: 'Más servicios', color: '#4B5563', priority: 12 },
};

/**
 * Zoom desde el que cada subtipo aparece en «Todos» (con «Mostrar servicios»):
 * primero lo que más se busca (comer, aseos, parques infantiles, información);
 * fuentes, gimnasios y demás, un nivel después para no saturar.
 * Con el filtro «Servicio» se ven a cualquier zoom (plegados a punto si no caben).
 */
export const SERVICE_ZOOM_TIER_A = 15.5;
export const SERVICE_ZOOM_TIER_B = 16.5;

const TIER_B: ReadonlySet<ServiceSubtype> = new Set([
  'agua',
  'gimnasio',
  'deporte',
  'bicis',
  'zona-canina',
  'desfibrilador',
]);

export function serviceSubtype(service: Pick<ParkService, 'type' | 'subtype'>): ServiceSubtype {
  return service.subtype ?? SUBTYPE_BY_TYPE[service.type];
}

export function serviceGroup(service: Pick<ParkService, 'type' | 'subtype'>): ServiceGroup {
  return SERVICE_SUBTYPES[serviceSubtype(service)].group;
}

export function serviceMinZoom(service: Pick<ParkService, 'type' | 'subtype'>): number {
  return TIER_B.has(serviceSubtype(service)) ? SERVICE_ZOOM_TIER_B : SERVICE_ZOOM_TIER_A;
}

export function serviceMarkerPriority(service: Pick<ParkService, 'type' | 'subtype'>): number {
  const subtype = serviceSubtype(service);
  if (subtype === 'acceso') return 18;
  return SERVICE_GROUP_META[serviceGroup(service)].priority;
}

export function serviceColor(service: Pick<ParkService, 'type' | 'subtype'>): string {
  if (serviceSubtype(service) === 'acceso') return SERVICE_TYPE_META.acceso.color;
  return SERVICE_GROUP_META[serviceGroup(service)].color;
}

export function getServiceTypeLabel(type: ServiceType): string {
  return SERVICE_TYPE_META[type].label;
}

/** Etiqueta visible del servicio (subtipo): «Cafetería», «Aseos», «Parque infantil»… */
export function getServiceLabel(service: Pick<ParkService, 'type' | 'subtype'>): string {
  return SERVICE_SUBTYPES[serviceSubtype(service)].label;
}

/**
 * Pictogramas SVG (viewBox 16×16, trazo en `currentColor`): no dependen de que la
 * fuente del sistema tenga emojis y se leen igual en iOS y Android.
 */
export const SERVICE_ICON_PATHS: Record<
  ServiceSubtype,
  { stroke?: string; fill?: string; text?: string }
> = {
  cafe: {
    stroke:
      'M3 6.5h8v3.5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM11 7.5h1.2a1.6 1.6 0 0 1 0 3.2H11M6 2.5v2M8.5 2.5v2',
  },
  bar: { stroke: 'M4.5 2.5h7l-.6 3.8a2.9 2.9 0 0 1-5.8 0zM8 9.2v4.3M5.5 13.5h5' },
  restaurante: {
    stroke: 'M4 2.5v3.5a1.5 1.5 0 0 0 3 0V2.5M5.5 7.5v6M11.5 2.5c-1.6 1-2.2 3-2.2 5.2h2.2v5.8',
  },
  helados: { stroke: 'M4.6 7.2a3.4 3.4 0 0 1 6.8 0zM5 7.2l3 6.6 3-6.6' },
  quiosco: { stroke: 'M2.5 6.5l1.5-3.5h8l1.5 3.5zM3.5 6.5v7h9v-7M6.5 13.5v-3.5h3v3.5' },
  aseo: { text: 'WC' },
  agua: { fill: 'M8 2c2.8 3.5 4.2 5.9 4.2 7.7a4.2 4.2 0 0 1-8.4 0C3.8 7.9 5.2 5.5 8 2z' },
  'parque-infantil': {
    stroke: 'M2.5 13.5L5 2.8h6l2.5 10.7M5 2.8h6M6.6 3v6.3M9.4 3v6.3M5.9 9.5h4.2',
  },
  gimnasio: { stroke: 'M3 8h10M4.5 5v6M11.5 5v6M2.5 6.5v3M13.5 6.5v3' },
  deporte: {
    stroke:
      'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 1 0 0-11zM2.5 8h11M8 2.5c-2.2 2.4-2.2 8.6 0 11M8 2.5c2.2 2.4 2.2 8.6 0 11',
  },
  informacion: { stroke: 'M8 7v5.5', fill: 'M8 3.2a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 1 0 0-2.2z' },
  barcas: { stroke: 'M1.8 9.5h12.4l-2 3.8H3.8zM8 9.5V2.8l3.8 4.8H8' },
  desfibrilador: {
    stroke:
      'M8 13.5S2.2 10.2 2.2 6.2a2.9 2.9 0 0 1 5.8-.9 2.9 2.9 0 0 1 5.8.9c0 4-5.8 7.3-5.8 7.3zM8.6 5.6L7.2 8.4h1.8L7.6 11',
  },
  bicis: {
    stroke:
      'M4 8.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 1 0 0-4.8zM12 8.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 1 0 0-4.8zM4 11l2.4-5h4.2L12 11M6.4 6l1.8 5 2.4-5M5.6 4.4h2',
  },
  'zona-canina': {
    fill: 'M8 8.2c-2.2 0-3.8 2.2-3.8 3.6 0 1.2 1 1.7 2 1.4.8-.2 1.2-.4 1.8-.4s1 .2 1.8.4c1 .3 2-.2 2-1.4 0-1.4-1.6-3.6-3.8-3.6zM4 5.3a1.3 1.6 0 1 0 0 3.2 1.3 1.6 0 1 0 0-3.2zM12 5.3a1.3 1.6 0 1 0 0 3.2 1.3 1.6 0 1 0 0-3.2zM6.3 2.6a1.3 1.6 0 1 0 0 3.2 1.3 1.6 0 1 0 0-3.2zM9.7 2.6a1.3 1.6 0 1 0 0 3.2 1.3 1.6 0 1 0 0-3.2z',
  },
  acceso: { stroke: 'M3 13.5V7a5 5 0 0 1 10 0v6.5M6 13.5V8.6a2 2 0 0 1 4 0v4.9' },
  otros: { fill: 'M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5z' },
};

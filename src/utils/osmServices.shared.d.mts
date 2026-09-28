import type { z } from 'zod';
import type {
  FeaturedPrice,
  OsmService,
  ParkService,
  ServiceGroup,
  ServiceSubtype,
  ServiceType,
  Wheelchair,
} from '../types/service';

export const RETIRO_OSM_RELATION_ID: number;
export const SERVICE_SUBTYPES: Record<
  ServiceSubtype,
  { type: ServiceType; group: ServiceGroup; label: string; generic: string }
>;
export const SERVICE_GROUPS: readonly ServiceGroup[];
export const SUBTYPE_BY_TYPE: Record<ServiceType, ServiceSubtype>;
export const DEDUP_RADIUS_METERS: number;

export function classifyOsmTags(tags?: Record<string, string>): ServiceSubtype | null;
export function serviceDisplayName(
  tags: Record<string, string>,
  subtype: ServiceSubtype,
): { name: string; named: boolean };

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
  members?: { type: string; geometry?: { lat: number; lon: number }[] }[];
}

export function elementCoordinates(element: OverpassElement): [number, number] | null;
export function normalizeOsmElement(
  element: OverpassElement,
  options: { checkedAt: string },
): OsmService | null;
export function ringsFromRelation(members?: OverpassElement['members']): [number, number][][];
export function pointInRings(point: [number, number], rings: [number, number][][]): boolean;
export function simplifyRing(ring: [number, number][], tolerance?: number): [number, number][];
export function distanceMeters(a: [number, number], b: [number, number]): number;
export function osmIdFromUrl(url: string | undefined): string | null;

export interface ServiceMatch {
  osmId: string;
  subtype: string;
  matchedId: string;
  matchedKind: 'service' | 'place';
  reason: string;
  enrich?: {
    openingHours?: string;
    wheelchair?: Wheelchair;
    fee?: boolean;
    website?: string;
    menuUrl?: string;
  };
}

export function dedupeServices(
  osmServices: OsmService[],
  curatedServices: Pick<ParkService, 'id' | 'type' | 'coordinates' | 'sourceUrl'>[],
  places?: {
    id: string;
    name: string;
    alternativeNames?: string[];
    coordinates: [number, number];
    sourceUrl?: string;
  }[],
  manualMatches?: Record<string, { id: string; kind?: 'service' | 'place' }>,
): { services: OsmService[]; matches: ServiceMatch[] };
export function nearestPlaceName(
  coordinates: [number, number],
  places: { name: string; coordinates: [number, number]; area?: string; category?: string }[],
  maxMeters?: number,
): string | undefined;
export function formatOpeningHours(value: string | undefined): string;

export const featuredPriceSchema: z.ZodType<FeaturedPrice, unknown>;
export const osmServiceSchema: z.ZodType<OsmService, unknown>;
export interface OsmServicesDataset {
  source: string;
  license: 'ODbL-1.0';
  attribution: string;
  attributionUrl: string;
  area: string;
  extractedAt: string;
  osmBaseTimestamp: string | null;
  counts: {
    found: Record<string, number>;
    added: Record<string, number>;
    total: number;
    added_total: number;
  };
  boundary: [number, number][][];
  services: OsmService[];
  matches: ServiceMatch[];
}
export const osmServicesDatasetSchema: z.ZodType<OsmServicesDataset, unknown>;

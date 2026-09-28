export type ServiceType =
  | 'aseo'
  | 'fuente'
  | 'zona-infantil'
  | 'acceso'
  | 'informacion'
  | 'restauracion'
  | 'deporte'
  | 'otros';

/** Pictograma del servicio (más fino que `type`). */
export type ServiceSubtype =
  | 'cafe'
  | 'bar'
  | 'restaurante'
  | 'helados'
  | 'quiosco'
  | 'aseo'
  | 'agua'
  | 'parque-infantil'
  | 'gimnasio'
  | 'deporte'
  | 'informacion'
  | 'barcas'
  | 'desfibrilador'
  | 'bicis'
  | 'zona-canina'
  | 'acceso'
  | 'otros';

/** Grupos de los chips de filtro de servicios. */
export type ServiceGroup = 'comer' | 'aseos' | 'agua' | 'infantil' | 'deporte' | 'mas';

export type PlaceStatus = 'verified' | 'needs-review';

export type Wheelchair = 'yes' | 'limited' | 'no';

/**
 * Precio destacado verificado. Diseño documentado (docs/servicios-osm.md) pero sin
 * uso en la interfaz: solo con fuente primaria (carta del local) y fecha de comprobación.
 */
export interface FeaturedPrice {
  item: string;
  price: number;
  currency: 'EUR';
  checkedAt: string;
  source: string;
}

export interface ParkService {
  id: string;
  name: string;
  type: ServiceType;
  coordinates: [number, number];
  shortDescription: string;
  sourceName: string;
  sourceUrl: string;
  lastVerifiedAt: string;
  status: PlaceStatus;
  accessibility?: string[];
  availabilityNote?: string;
  /** Pictograma; si falta se deriva de `type`. */
  subtype?: ServiceSubtype;
  /** `curated`: services.json; `osm`: extracción de OpenStreetMap (services-osm.json). */
  origin?: 'curated' | 'osm';
  /** Horario en sintaxis `opening_hours` de OSM. */
  openingHours?: string;
  wheelchair?: Wheelchair;
  /** `false`: gratuito. */
  fee?: boolean;
  website?: string;
  menuUrl?: string;
  /** Lugar curado cercano, para dar contexto a los nombres genéricos. */
  near?: string;
  /** Nombre propio que se rotula bajo el icono a zoom alto (cafés, bares…). */
  mapLabel?: string;
  featuredPrices?: FeaturedPrice[];
}

/** Elemento de `src/data/services-osm.json` (generado por scripts/services-osm.mjs). */
export interface OsmService {
  id: string;
  osmId: string;
  name: string;
  named: boolean;
  type: ServiceType;
  subtype: ServiceSubtype;
  coordinates: [number, number];
  lastCheckedAt: string;
  near?: string;
  openingHours?: string;
  wheelchair?: Wheelchair;
  fee?: boolean;
  website?: string;
  menuUrl?: string;
  osmCheckDate?: string;
  featuredPrices?: FeaturedPrice[];
}

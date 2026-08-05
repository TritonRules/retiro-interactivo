export type PlaceCategory =
  | 'iconico'
  | 'monumento'
  | 'cultura'
  | 'naturaleza'
  | 'familias'
  | 'paseo'
  | 'servicio'
  | 'acceso';

export type PlaceStatus = 'verified' | 'needs-review';

export interface Place {
  id: string;
  slug: string;
  name: string;
  category: PlaceCategory;
  /** [longitud, latitud] — orden GeoJSON / MapLibre */
  coordinates: [number, number];
  shortDescription: string;
  description: string;
  tags: string[];
  sourceName: string;
  sourceUrl: string;
  lastVerifiedAt: string;
  status: PlaceStatus;
  accessibility?: string[];
  openingHoursNote?: string;
}

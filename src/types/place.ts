import type { ParkVideo } from './video';

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

export type PlaceAudience = 'familias' | 'turistas' | 'locales' | 'deportistas';

export type SourceTier = 'A' | 'B' | 'C' | 'D';

export interface Place {
  id: string;
  slug: string;
  name: string;
  alternativeNames?: string[];
  category: PlaceCategory;
  /** [longitud, latitud] — orden GeoJSON / MapLibre */
  coordinates: [number, number];
  shortDescription: string;
  description: string;
  tags: string[];
  audience?: PlaceAudience[];
  recommendedDurationMinutes?: number;
  bestFor?: string[];
  area?: 'retiro' | 'entorno';
  sourceName: string;
  sourceUrl: string;
  sourceTier?: SourceTier;
  lastVerifiedAt: string;
  status: PlaceStatus;
  accessibility?: string[];
  openingHoursNote?: string;
  /** Vídeos del canal del proyecto; sin vídeos no se muestra el bloque. */
  videos?: ParkVideo[];
}

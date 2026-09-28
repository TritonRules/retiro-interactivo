import type { ParkVideo } from './video';

export type PlaceCategory =
  | 'iconico'
  | 'monumento'
  | 'escultura'
  | 'cultura'
  | 'naturaleza'
  | 'familias'
  | 'paseo'
  | 'servicio'
  | 'acceso';

export type PlaceStatus = 'verified' | 'needs-review';

export type PlaceAudience = 'familias' | 'turistas' | 'locales' | 'deportistas';

export type SourceTier = 'A' | 'B' | 'C' | 'D';

/** Datos de autoría de estatuas y esculturas (solo lo verificado). */
export interface PlaceArtwork {
  /** Escultores o talleres; vacío si la autoría no está verificada. */
  authors?: string[];
  /** Año o periodo, en texto («1907», «1743–1748», «Siglo XIX»). */
  date?: string;
}

export interface PlaceSourceLink {
  name: string;
  url: string;
}

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
  /** Autoría y fecha de estatuas y esculturas. */
  artwork?: PlaceArtwork;
  /** Fuentes de contraste además de la principal (`sourceUrl`). */
  additionalSources?: PlaceSourceLink[];
  /**
   * Zoom mínimo al que el icono aparece en el mapa general (sin filtro de categoría).
   * Evita saturar la vista de parque con piezas menores; seleccionado o con su
   * filtro activo se muestra siempre.
   */
  mapMinZoom?: number;
}

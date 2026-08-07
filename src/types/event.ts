export type EventSourceTier = 'A' | 'B' | 'C' | 'D';

export type EventStatus =
  | 'draft'
  | 'published'
  | 'cancelled'
  | 'postponed'
  | 'expired'
  | 'needs-review';

/** Datos del evento que consume el mapa: marcador y ficha. */
export interface MapEventPoint {
  id: string;
  slug: string;
  title: string;
  coordinates: [number, number];
  startAt: string;
  venue: string;
}

export interface ParkEvent {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  startAt: string;
  endAt?: string;
  allDay?: boolean;
  venue: string;
  coordinates?: [number, number];
  category: string;
  audience?: string[];
  priceNote?: string;
  registrationUrl?: string;
  sourceName: string;
  sourceUrl: string;
  sourceTier: EventSourceTier;
  sourceEventId?: string;
  sourceUpdatedAt?: string;
  lastCheckedAt: string;
  expiresAt: string;
  confidence: number;
  status: EventStatus;
}

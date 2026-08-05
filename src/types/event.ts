export type EventSourceTier = 'A' | 'B' | 'C' | 'D';

export type EventStatus =
  | 'draft'
  | 'published'
  | 'cancelled'
  | 'postponed'
  | 'expired'
  | 'needs-review';

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

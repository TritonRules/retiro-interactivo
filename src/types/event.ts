export type EventSourceTier = 'A' | 'B' | 'C' | 'D';

export type EventStatus =
  | 'draft'
  | 'published'
  | 'cancelled'
  | 'postponed'
  | 'expired'
  | 'needs-review';

export type TimePrecision = 'exact' | 'unknown' | 'allDay';

export type RecurrenceFrequency = 'WEEKLY' | 'DAILY';

export type WeekdayCode = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

export interface EventRecurrence {
  frequency: RecurrenceFrequency;
  interval: number;
  byDay: WeekdayCode[];
  /** Fin exclusivo del periodo de la serie (instante ISO). */
  untilExclusive: string;
  /** Días civiles Madrid YYYY-MM-DD que no se celebran. */
  excludedDays: string[];
}

export interface EventSchedule {
  timePrecision: TimePrecision;
  /** Sesiones horarias HH:mm en reloj Madrid; vacío si la hora es desconocida o todo el día. */
  sessionTimes: string[];
  recurrence?: EventRecurrence;
  parseIssues?: string[];
}

/** Datos del evento que consume el mapa: marcador y ficha. */
export interface MapEventPoint {
  id: string;
  slug: string;
  title: string;
  coordinates: [number, number];
  startAt: string;
  endAt?: string;
  expiresAt: string;
  venue: string;
  status: EventStatus;
  lastCheckedAt?: string;
  schedule?: EventSchedule;
  sourceUrl: string;
  category: string;
  allDay?: boolean;
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
  lastCheckedAt?: string;
  expiresAt: string;
  confidence: number;
  status: EventStatus;
  schedule?: EventSchedule;
}

export interface SourcePublicationMeta {
  sourceId: string;
  lastSuccessfulFetchAt: string | null;
  lastAttemptAt: string;
  fromCache: boolean;
  fetchError: string | null;
}

export interface EventsPublication {
  schemaVersion: 1;
  publishedAt: string;
  datasetHash: string;
  coverageHorizonDays: number;
  sources: SourcePublicationMeta[];
}

export type RouteDifficulty = 'facil' | 'moderada';
export type RouteStatus = 'verified' | 'needs-review';

export interface ParkRoute {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  audience: string[];
  estimatedDurationMinutes: number;
  approximateDistanceMeters: number;
  difficulty: RouteDifficulty;
  circular: boolean;
  stopIds: string[];
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  startPlaceId?: string;
  endPlaceId?: string;
  accessibilityNote?: string;
  sourceName: string;
  sourceUrl: string;
  lastVerifiedAt: string;
  status: RouteStatus;
}

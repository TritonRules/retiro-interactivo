export type ServiceType =
  | 'aseo'
  | 'fuente'
  | 'zona-infantil'
  | 'acceso'
  | 'informacion'
  | 'restauracion'
  | 'deporte'
  | 'otros';

export type PlaceStatus = 'verified' | 'needs-review';

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
}

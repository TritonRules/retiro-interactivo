import type { VisitCatalogItem } from '../components/visit/MiVisita';
import { places } from './places';
import { services } from './services';
import { getCategoryLabel } from './categories';
import { getServiceLabel } from './serviceTypes';

/** Catálogo ligero (sin descripciones) para la página «Mi visita». */
export function buildVisitCatalog(base: string): VisitCatalogItem[] {
  return [
    ...places.map((p) => ({
      kind: 'place' as const,
      id: p.id,
      name: p.name,
      label: getCategoryLabel(p.category),
      coordinates: p.coordinates,
      mapHref: `${base}?lugar=${p.slug}`,
    })),
    ...services.map((s) => ({
      kind: 'service' as const,
      id: s.id,
      name: s.name,
      label: getServiceLabel(s),
      coordinates: s.coordinates,
      mapHref: `${base}?servicio=${encodeURIComponent(s.id)}`,
    })),
  ];
}

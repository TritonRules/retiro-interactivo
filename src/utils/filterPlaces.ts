import type { Place, PlaceCategory } from '../types/place';
import type { ParkService } from '../types/service';

export type CategoryFilter = PlaceCategory | 'todos';

export function filterPlacesByCategory(
  places: Place[],
  category: CategoryFilter,
): Place[] {
  if (category === 'todos') return places;
  if (category === 'servicio') return [];
  return places.filter((place) => place.category === category);
}

export function filterServicesByCategory(
  services: ParkService[],
  category: CategoryFilter,
  /** En "todos", mostrar servicios solo si el usuario lo permite. */
  includeServicesInTodos: boolean,
): ParkService[] {
  if (category === 'servicio') return services;
  if (category === 'todos') return includeServicesInTodos ? services : [];
  return [];
}

export function countByCategory(
  places: Place[],
  services: ParkService[] = [],
): Record<CategoryFilter, number> {
  const counts = {
    todos: places.length + services.length,
    iconico: 0,
    monumento: 0,
    escultura: 0,
    cultura: 0,
    naturaleza: 0,
    familias: 0,
    paseo: 0,
    servicio: services.length,
    acceso: 0,
  } satisfies Record<CategoryFilter, number>;

  for (const place of places) {
    if (place.category !== 'servicio') {
      counts[place.category] += 1;
    } else {
      counts.servicio += 1;
    }
  }

  return counts;
}

export function parseCategoryParam(value: string | null | undefined): CategoryFilter {
  if (!value || value === 'todos') return 'todos';
  const allowed: CategoryFilter[] = [
    'iconico',
    'monumento',
    'escultura',
    'cultura',
    'naturaleza',
    'familias',
    'paseo',
    'servicio',
    'acceso',
  ];
  return allowed.includes(value as CategoryFilter) ? (value as CategoryFilter) : 'todos';
}

import type { Place, PlaceCategory } from '../types/place';

export type CategoryFilter = PlaceCategory | 'todos';

export function filterPlacesByCategory(
  places: Place[],
  category: CategoryFilter,
): Place[] {
  if (category === 'todos') return places;
  return places.filter((place) => place.category === category);
}

export function countByCategory(places: Place[]): Record<CategoryFilter, number> {
  const counts = {
    todos: places.length,
    iconico: 0,
    monumento: 0,
    cultura: 0,
    naturaleza: 0,
    familias: 0,
    paseo: 0,
    servicio: 0,
    acceso: 0,
  } satisfies Record<CategoryFilter, number>;

  for (const place of places) {
    counts[place.category] += 1;
  }

  return counts;
}

export function parseCategoryParam(value: string | null | undefined): CategoryFilter {
  if (!value || value === 'todos') return 'todos';
  const allowed: CategoryFilter[] = [
    'iconico',
    'monumento',
    'cultura',
    'naturaleza',
    'familias',
    'paseo',
    'servicio',
    'acceso',
  ];
  return allowed.includes(value as CategoryFilter) ? (value as CategoryFilter) : 'todos';
}

import type { PlaceCategory } from '../types/place';

export interface CategoryMeta {
  id: PlaceCategory | 'todos';
  label: string;
  /** Forma distintiva además del color (accesibilidad). */
  shape:
    | 'circle'
    | 'square'
    | 'diamond'
    | 'triangle'
    | 'star'
    | 'hexagon'
    | 'pin'
    | 'arch'
    | 'pedestal';
  color: string;
  /** Variante para texto sobre fondo claro cuando `color` no alcanza 4,5:1. */
  textColor?: string;
}

export const CATEGORY_META: Record<PlaceCategory, Omit<CategoryMeta, 'id'>> = {
  iconico: { label: 'Icónico', shape: 'star', color: '#1B5E3B' },
  monumento: { label: 'Monumento', shape: 'triangle', color: '#C45C26', textColor: '#B45523' },
  escultura: { label: 'Estatuas', shape: 'pedestal', color: '#6A4C93' },
  cultura: { label: 'Cultura', shape: 'square', color: '#2F6F8F' },
  naturaleza: { label: 'Naturaleza', shape: 'circle', color: '#3D7A4A' },
  familias: { label: 'Familias', shape: 'hexagon', color: '#B8860B', textColor: '#906909' },
  paseo: { label: 'Paseo', shape: 'diamond', color: '#5C6B4A' },
  servicio: { label: 'Servicio', shape: 'pin', color: '#6B5B4F' },
  acceso: { label: 'Acceso', shape: 'arch', color: '#8B4513' },
};

export const FILTER_OPTIONS: CategoryMeta[] = [
  { id: 'todos', label: 'Todos', shape: 'circle', color: '#1B5E3B' },
  ...Object.entries(CATEGORY_META).map(([id, meta]) => ({
    id: id as PlaceCategory,
    ...meta,
  })),
];

export function isPlaceCategory(value: string): value is PlaceCategory {
  return value in CATEGORY_META;
}

export function getCategoryLabel(category: PlaceCategory): string {
  return CATEGORY_META[category].label;
}

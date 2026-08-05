import type { ServiceType } from '../types/service';

export const SERVICE_TYPE_META: Record<
  ServiceType,
  { label: string; glyph: string; color: string }
> = {
  aseo: { label: 'Aseo', glyph: 'WC', color: '#6B5B4F' },
  fuente: { label: 'Agua potable', glyph: '💧', color: '#2F6F8F' },
  'zona-infantil': { label: 'Zona infantil', glyph: '◇', color: '#B8860B' },
  acceso: { label: 'Acceso', glyph: '⊓', color: '#8B4513' },
  informacion: { label: 'Información', glyph: 'i', color: '#2F6F8F' },
  restauracion: { label: 'Restauración', glyph: '◌', color: '#C45C26' },
  deporte: { label: 'Deporte', glyph: '▣', color: '#1B5E3B' },
  otros: { label: 'Otros', glyph: '·', color: '#5C6B4A' },
};

export function getServiceTypeLabel(type: ServiceType): string {
  return SERVICE_TYPE_META[type].label;
}

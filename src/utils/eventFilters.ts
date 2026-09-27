import { normalizeSearchText } from './categoryLabels';
import type { ParkEvent } from '../types/event';

export interface AgendaFilters {
  categoria: string;
  publico: string;
}

export function parseAgendaFilters(search: string | URLSearchParams): AgendaFilters {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  return {
    categoria: (params.get('categoria') ?? '').trim(),
    publico: (params.get('publico') ?? '').trim(),
  };
}

export function filterEventsByQuery(events: ParkEvent[], filters: AgendaFilters): ParkEvent[] {
  const audienceQ = normalizeSearchText(filters.publico);
  return events.filter((event) => {
    if (filters.categoria && event.category !== filters.categoria) return false;
    if (audienceQ) {
      const audiences = event.audience ?? [];
      const hit = audiences.some((item) => normalizeSearchText(item).includes(audienceQ));
      if (!hit) return false;
    }
    return true;
  });
}

export function uniqueCategories(events: ParkEvent[]): string[] {
  return [...new Set(events.map((event) => event.category))].sort();
}

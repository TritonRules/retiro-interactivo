import type { Place } from '../types/place';

/**
 * Línea de autoría de una estatua o escultura para fichas y páginas:
 * «Mariano Benlliure · 1907». Solo con lo verificado; sin datos devuelve null.
 */
export function formatArtworkCredit(place: Pick<Place, 'artwork'>): string | null {
  const authors = place.artwork?.authors?.filter(Boolean) ?? [];
  const date = place.artwork?.date?.trim();
  const parts = [authors.join(', '), date].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(' · ') : null;
}

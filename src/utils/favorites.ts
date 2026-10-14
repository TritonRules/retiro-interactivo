/**
 * «Mi visita»: favoritos guardados solo en este dispositivo (localStorage).
 * Sin cuenta ni servidor. La clave lleva versión para poder migrar el formato.
 */
export type FavoriteKind = 'place' | 'service';

export interface FavoriteItem {
  kind: FavoriteKind;
  id: string;
  /** Marca de tiempo (ms) de cuándo se guardó; ordena la lista. */
  savedAt: number;
}

export const FAVORITES_STORAGE_KEY = 'retiro-interactivo:mi-visita:v1';
export const FAVORITES_CHANGE_EVENT = 'retiro:favoritos';
const VERSION = 1;

interface StoredFavorites {
  version: number;
  items: FavoriteItem[];
}

export function favoriteKey(item: Pick<FavoriteItem, 'kind' | 'id'>): string {
  return `${item.kind}:${item.id}`;
}

function isFavoriteItem(value: unknown): value is FavoriteItem {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    (v.kind === 'place' || v.kind === 'service') &&
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.savedAt === 'number'
  );
}

/** Interpreta el JSON guardado; cualquier dato roto o de otra versión da lista vacía. */
export function parseFavorites(raw: string | null): FavoriteItem[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as Partial<StoredFavorites>;
    if (!data || data.version !== VERSION || !Array.isArray(data.items)) return [];
    const seen = new Set<string>();
    const out: FavoriteItem[] = [];
    for (const item of data.items) {
      if (!isFavoriteItem(item)) continue;
      const key = favoriteKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind: item.kind, id: item.id, savedAt: item.savedAt });
    }
    return out;
  } catch {
    return [];
  }
}

export function serializeFavorites(items: FavoriteItem[]): string {
  return JSON.stringify({ version: VERSION, items } satisfies StoredFavorites);
}

/**
 * Descarta favoritos cuyo id ya no existe en los datos (lugar retirado o renombrado).
 * No toca el almacenamiento: se limpia al siguiente guardado.
 */
export function pruneFavorites(
  items: FavoriteItem[],
  known: { places: Set<string>; services: Set<string> },
): FavoriteItem[] {
  return items.filter((item) =>
    item.kind === 'place' ? known.places.has(item.id) : known.services.has(item.id),
  );
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadFavorites(): FavoriteItem[] {
  try {
    return parseFavorites(storage()?.getItem(FAVORITES_STORAGE_KEY) ?? null);
  } catch {
    return [];
  }
}

export function saveFavorites(items: FavoriteItem[]): void {
  try {
    storage()?.setItem(FAVORITES_STORAGE_KEY, serializeFavorites(items));
  } catch {
    /* modo privado o cuota llena: se mantiene en memoria */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(FAVORITES_CHANGE_EVENT));
}

export function toggleFavoriteIn(
  items: FavoriteItem[],
  item: Pick<FavoriteItem, 'kind' | 'id'>,
  now = Date.now(),
): FavoriteItem[] {
  const key = favoriteKey(item);
  if (items.some((i) => favoriteKey(i) === key)) return items.filter((i) => favoriteKey(i) !== key);
  return [...items, { kind: item.kind, id: item.id, savedAt: now }];
}

/** Añade varios (presets «por intereses») sin duplicar. */
export function addFavoritesIn(
  items: FavoriteItem[],
  toAdd: Pick<FavoriteItem, 'kind' | 'id'>[],
  now = Date.now(),
): FavoriteItem[] {
  let next = items;
  toAdd.forEach((item, index) => {
    if (!next.some((i) => favoriteKey(i) === favoriteKey(item))) {
      next = [...next, { kind: item.kind, id: item.id, savedAt: now + index }];
    }
  });
  return next;
}

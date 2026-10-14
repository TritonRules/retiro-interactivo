import { useCallback, useEffect, useState } from 'react';
import {
  FAVORITES_CHANGE_EVENT,
  FAVORITES_STORAGE_KEY,
  addFavoritesIn,
  favoriteKey,
  loadFavorites,
  saveFavorites,
  toggleFavoriteIn,
  type FavoriteItem,
  type FavoriteKind,
} from './favorites';

/** Favoritos sincronizados entre componentes y pestañas. */
export function useFavorites() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sync = () => setItems(loadFavorites());
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === FAVORITES_STORAGE_KEY) sync();
    };
    sync();
    setLoaded(true);
    window.addEventListener(FAVORITES_CHANGE_EVENT, sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(FAVORITES_CHANGE_EVENT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const isFavorite = useCallback(
    (kind: FavoriteKind, id: string) => items.some((i) => favoriteKey(i) === `${kind}:${id}`),
    [items],
  );
  const toggle = useCallback((kind: FavoriteKind, id: string) => {
    saveFavorites(toggleFavoriteIn(loadFavorites(), { kind, id }));
  }, []);
  const remove = useCallback((kind: FavoriteKind, id: string) => {
    saveFavorites(loadFavorites().filter((i) => favoriteKey(i) !== `${kind}:${id}`));
  }, []);
  const addMany = useCallback((list: { kind: FavoriteKind; id: string }[]) => {
    saveFavorites(addFavoritesIn(loadFavorites(), list));
  }, []);
  const clear = useCallback(() => saveFavorites([]), []);

  return { items, loaded, isFavorite, toggle, remove, addMany, clear };
}

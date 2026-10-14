import { describe, expect, it } from 'vitest';
import {
  addFavoritesIn,
  parseFavorites,
  pruneFavorites,
  serializeFavorites,
  toggleFavoriteIn,
} from './favorites';

describe('favoritos de Mi visita', () => {
  it('ida y vuelta por JSON versionado', () => {
    const items = toggleFavoriteIn([], { kind: 'place', id: 'estanque-grande' }, 1);
    expect(parseFavorites(serializeFavorites(items))).toEqual(items);
  });

  it('alternar quita y pone', () => {
    let items = toggleFavoriteIn([], { kind: 'place', id: 'a' }, 1);
    items = toggleFavoriteIn(items, { kind: 'service', id: 'a' }, 2);
    expect(items).toHaveLength(2);
    items = toggleFavoriteIn(items, { kind: 'place', id: 'a' }, 3);
    expect(items).toEqual([{ kind: 'service', id: 'a', savedAt: 2 }]);
  });

  it('resiste datos rotos, otra versión y elementos inválidos', () => {
    expect(parseFavorites(null)).toEqual([]);
    expect(parseFavorites('{no json')).toEqual([]);
    expect(parseFavorites(JSON.stringify({ version: 99, items: [] }))).toEqual([]);
    const raw = JSON.stringify({
      version: 1,
      items: [
        { kind: 'place', id: 'ok', savedAt: 1 },
        { kind: 'place', id: 'ok', savedAt: 2 },
        { kind: 'evento', id: 'x', savedAt: 1 },
        { kind: 'place', id: '', savedAt: 1 },
        null,
      ],
    });
    expect(parseFavorites(raw)).toEqual([{ kind: 'place', id: 'ok', savedAt: 1 }]);
  });

  it('descarta ids que ya no existen', () => {
    const items = [
      { kind: 'place' as const, id: 'vive', savedAt: 1 },
      { kind: 'place' as const, id: 'retirado', savedAt: 2 },
      { kind: 'service' as const, id: 's1', savedAt: 3 },
    ];
    const pruned = pruneFavorites(items, { places: new Set(['vive']), services: new Set(['s1']) });
    expect(pruned.map((i) => i.id)).toEqual(['vive', 's1']);
  });

  it('añadir un preset no duplica', () => {
    const base = [{ kind: 'place' as const, id: 'a', savedAt: 1 }];
    const next = addFavoritesIn(
      base,
      [
        { kind: 'place', id: 'a' },
        { kind: 'place', id: 'b' },
      ],
      10,
    );
    expect(next.map((i) => i.id)).toEqual(['a', 'b']);
  });
});

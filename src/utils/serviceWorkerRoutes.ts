/**
 * Patrones de navegación que comparten `astro.config.mjs` y sus tests.
 *
 * El service worker precachea la shell del mapa y responde con ella a las
 * navegaciones que no encuentra en el precaché. Sin acotar ese comportamiento,
 * la shell suplanta a cualquier página excluida del precaché —las fichas de
 * evento, que cambian cada semana— y el usuario acaba de vuelta en el mapa.
 */

export function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Única navegación que puede resolverse con la shell: la propia shell, con o sin `?lugar=`, `?ruta=` o `?evento=`. */
export function shellNavigationPattern(basePath: string): RegExp {
  return new RegExp(`^${escapeForRegExp(basePath)}(\\?.*)?$`);
}

/** Fichas de evento: `<base>agenda/<slug>/`, servidas en tiempo de ejecución. */
export function eventPagePattern(basePath: string): RegExp {
  return new RegExp(`${escapeForRegExp(basePath)}agenda/[^/]+/$`);
}

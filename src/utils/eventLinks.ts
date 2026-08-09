/**
 * Ruta de la ficha de un evento relativa a la base del sitio.
 *
 * Mapa y agenda comparten esta regla para no generar destinos divergentes.
 * Vive fuera de `events.ts` para que el mapa no arrastre el dataset al cliente.
 */
export function eventDetailPath(slug: string): string {
  return `agenda/${slug}/`;
}

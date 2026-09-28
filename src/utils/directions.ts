/**
 * Enlace «Cómo llegar» a pie. Google Maps abre la app nativa en iOS/Android si está
 * instalada y, si no, la web; no requiere clave ni envía datos del usuario desde aquí.
 */
export function walkingDirectionsUrl([lon, lat]: [number, number]): string {
  const destination = `${lat.toFixed(6)},${lon.toFixed(6)}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking`;
}

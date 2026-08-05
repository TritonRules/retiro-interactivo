/** Formateo de fechas ISO en zona Europe/Madrid. */
export function formatMadridDateTime(
  iso: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  },
): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    ...options,
  }).format(new Date(iso));
}

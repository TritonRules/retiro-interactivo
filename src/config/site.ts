/**
 * Metadatos del sitio. Mantén BASE alineado con astro.config.mjs / env BASE.
 */
export const siteConfig = {
  name: 'Retiro Interactivo',
  tagline: 'Descubre El Retiro a tu manera',
  description:
    'Mapa digital del Parque del Retiro de Madrid: lugares, servicios, rutas y agenda mobile first.',
  locale: 'es-ES',
  /** Canal de contacto configurable (sin inventar correo). Vacío = no mostrar. */
  contactUrl: '' as string,
  /** Etiqueta del enlace de contacto cuando contactUrl está definido. */
  contactLabel: 'Contacto',
  phase: 'Fase 3 — Beta privada (preparación)',
} as const;

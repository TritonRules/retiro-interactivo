// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

/**
 * GitHub Pages: ajusta SITE y BASE al repositorio real.
 * Ejemplo: SITE=https://usuario.github.io BASE=/retiro-interactivo
 * En local puedes usar BASE=/ para servir en la raíz.
 */
const site = process.env.SITE ?? 'https://example.github.io';
const base = process.env.BASE ?? '/retiro-interactivo';

// https://astro.build/config
export default defineConfig({
  site,
  base,
  output: 'static',
  integrations: [react()],
  trailingSlash: 'always',
});

// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import AstroPWA from '@vite-pwa/astro';
import { eventPagePattern, shellNavigationPattern } from './src/utils/serviceWorkerRoutes.ts';

/**
 * GitHub Pages: ajusta SITE y BASE al repositorio real.
 * Ejemplo: SITE=https://usuario.github.io BASE=/retiro-interactivo
 * En local puedes usar BASE=/ para servir en la raíz.
 */
const site = process.env.SITE ?? 'https://example.github.io';
const base = process.env.BASE ?? '/retiro-interactivo';
const basePath = base.endsWith('/') ? base : `${base}/`;
const outDir = process.env.ASTRO_OUT_DIR ?? 'dist';

// https://astro.build/config
export default defineConfig({
  site,
  base,
  outDir,
  output: 'static',
  integrations: [
    react(),
    AstroPWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg',
        'icons/icon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable-512.png',
        'data/places.geojson',
        'data/services.geojson',
      ],
      manifest: {
        name: 'Retiro Interactivo',
        short_name: 'Retiro',
        description:
          'Mapa digital del Parque del Retiro de Madrid: lugares, servicios y descubrimiento.',
        lang: 'es-ES',
        dir: 'ltr',
        start_url: basePath,
        scope: basePath,
        display: 'standalone',
        background_color: '#F7F3EB',
        theme_color: '#1B5E3B',
        icons: [
          {
            src: `${basePath}icons/icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: `${basePath}icons/icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: `${basePath}icons/icon-maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Shell del mapa (index), no la página offline: las navegaciones con
        // ?ruta= / ?lugar= / ?evento= deben hidratar MapExplorer en preview/PWA.
        // La página /offline/ sigue precacheada y accesible directamente.
        navigateFallback: basePath,
        // Solo la propia shell puede resolverse con la shell. Sin esta lista, la
        // NavigationRoute atrapa cualquier navegación fuera del precaché —las
        // fichas de evento, excluidas más abajo— y devuelve el mapa en su lugar.
        navigateFallbackAllowlist: [shellNavigationPattern(basePath)],
        navigateFallbackDenylist: [
          /^\/api/,
          /\/sw\.js$/,
          /\/workbox-/,
          /\/manifest\.webmanifest$/,
        ],
        // Evita que un SW antiguo sirva indefinidamente la shell de fases previas.
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2,json,geojson}'],
        // La agenda cambia cada semana: sus fichas se sirven en tiempo de
        // ejecución en lugar de inflar el precaché con decenas de páginas.
        globIgnores: ['**/agenda/*/index.html'],
        runtimeCaching: [
          {
            // Fichas de evento: red primero y, sin conexión, la última visitada
            // o la página offline. Nunca la shell del mapa.
            urlPattern: eventPagePattern(basePath),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'retiro-eventos',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
              precacheFallback: { fallbackURL: `${basePath}offline/` },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.includes('/data/') &&
              (url.pathname.endsWith('.json') || url.pathname.endsWith('.geojson')),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'retiro-data',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // No cachear masivamente teselas de terceros.
            urlPattern: ({ url }) =>
              url.hostname.includes('openfreemap.org') ||
              url.hostname.includes('tiles.openfreemap.org'),
            handler: 'NetworkOnly',
          },
        ],
      },
      experimental: {
        directoryAndTrailingSlashHandler: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  trailingSlash: 'always',
  vite: {
    define: {
      'import.meta.env.PUBLIC_E2E_FIXTURE': JSON.stringify(process.env.E2E_FIXTURE ?? ''),
    },
  },
});

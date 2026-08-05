// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import AstroPWA from '@vite-pwa/astro';

/**
 * GitHub Pages: ajusta SITE y BASE al repositorio real.
 * Ejemplo: SITE=https://usuario.github.io BASE=/retiro-interactivo
 * En local puedes usar BASE=/ para servir en la raíz.
 */
const site = process.env.SITE ?? 'https://example.github.io';
const base = process.env.BASE ?? '/retiro-interactivo';
const basePath = base.endsWith('/') ? base : `${base}/`;

// https://astro.build/config
export default defineConfig({
  site,
  base,
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
        navigateFallback: `${basePath}offline/`,
        navigateFallbackDenylist: [/^\/api/],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2,json,geojson}'],
        globIgnores: ['**/agenda/*/index.html'],
        runtimeCaching: [
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
});

#!/usr/bin/env node
/**
 * Informe editorial de contenido publicado (no publica candidatos).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const places = JSON.parse(readFileSync(join(root, 'src/data/places.json'), 'utf8'));
const services = JSON.parse(readFileSync(join(root, 'src/data/services.json'), 'utf8'));
const routes = JSON.parse(readFileSync(join(root, 'src/data/routes.json'), 'utf8'));

const byCategory = {};
for (const p of places) byCategory[p.category] = (byCategory[p.category] || 0) + 1;
const byType = {};
for (const s of services) byType[s.type] = (byType[s.type] || 0) + 1;

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    places: places.length,
    services: services.length,
    fichas: places.length + services.length,
    routes: routes.length,
    needsReview: [...places, ...services].filter((x) => x.status === 'needs-review').length,
  },
  placesByCategory: byCategory,
  servicesByType: byType,
  routes: routes.map((r) => ({
    slug: r.slug,
    stops: r.stopIds.length,
    meters: r.approximateDistanceMeters,
    minutes: r.estimatedDurationMinutes,
  })),
};

mkdirSync(join(root, 'reports'), { recursive: true });
writeFileSync(
  join(root, 'reports/content-import-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  `OK content:report — ${report.totals.fichas} fichas (${report.totals.places}+${report.totals.services}), ${report.totals.routes} rutas`,
);

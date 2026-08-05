#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'reports/event-build-report.json');
if (!existsSync(path)) {
  console.error('No hay informe. Ejecuta primero npm run events:build');
  process.exit(1);
}
const report = JSON.parse(readFileSync(path, 'utf8'));
console.log(JSON.stringify({
  ranAt: report.ranAt,
  published: report.published,
  keptPrevious: report.keptPrevious,
  publishedUpcoming: report.publishedUpcoming,
  publishedCount: report.publishedCount,
  discarded: report.discarded,
  duplicates: report.duplicates,
  added: report.added?.length,
  changed: report.changed?.length,
  removed: report.removed?.length,
  errors: report.errors?.slice(0, 5),
}, null, 2));

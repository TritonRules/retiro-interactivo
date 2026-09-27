#!/usr/bin/env node
/**
 * Uso: node scripts/events-refresh-guard.mjs --previous <events.json anterior>
 * Sale con código 1 si la actualización no es segura (ver automation/lib/refresh-guard.mjs).
 */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateRefresh } from '../automation/lib/refresh-guard.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argIndex = process.argv.indexOf('--previous');
const previousPath = argIndex > -1 ? process.argv[argIndex + 1] : null;
if (!previousPath || !existsSync(previousPath)) {
  console.error('Falta --previous <ruta al events.json anterior>.');
  process.exit(1);
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const reportPath = join(root, 'reports/event-build-report.json');
const report = existsSync(reportPath) ? readJson(reportPath) : null;
const nowMs = report?.ranAt ? Date.parse(report.ranAt) : Date.now();
const result = evaluateRefresh({
  previous: readJson(previousPath),
  next: readJson(join(root, 'src/data/events.json')),
  report,
  nowMs,
});

const summary = [
  `Eventos próximos: ${result.previousUpcoming} antes → ${result.nextUpcoming} ahora (total ${result.previousTotal} → ${result.nextTotal}).`,
  ...result.reasons.map((reason) => `- ${reason}`),
].join('\n');

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### Guardia de agenda: ${result.ok ? 'OK' : 'BLOQUEADA'}\n\n${summary}\n`,
  );
}

if (!result.ok) {
  console.error(`ERROR events:guard — actualización bloqueada.\n${summary}`);
  process.exit(1);
}
console.log(`OK events:guard — ${summary}`);

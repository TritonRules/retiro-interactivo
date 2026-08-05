#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectEvents } from '../automation/collectors/madrid-open-data-agenda.mjs';
import { normalizeCollected } from '../automation/normalizers/normalize-events.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadRegistry() {
  const raw = readFileSync(join(root, 'automation/sources/source-registry.yml'), 'utf8');
  const items = [];
  let current = null;
  for (const line of raw.split('\n')) {
    const idMatch = line.match(/^- id:\s*(.+)$/);
    if (idMatch) {
      if (current) items.push(current);
      current = { id: idMatch[1].trim() };
      continue;
    }
    if (!current) continue;
    const kv = line.match(/^\s+([a-z_]+):\s*(.*)$/);
    if (kv) {
      let val = kv[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      current[kv[1]] = val;
    }
  }
  if (current) items.push(current);
  return Object.fromEntries(items.map((i) => [i.id, i]));
}

const offline = process.argv.includes('--offline') || existsSync(join(root, 'automation/cache/madrid-agenda-general.json'));
const collected = await collectEvents({ offline: process.argv.includes('--offline') });
const { candidates, discarded } = normalizeCollected(collected, loadRegistry());
mkdirSync(join(root, 'data/candidates'), { recursive: true });
writeFileSync(
  join(root, 'data/candidates/events-candidates.json'),
  `${JSON.stringify(candidates, null, 2)}\n`,
);
console.log(
  `OK events:normalize — ${candidates.length} candidatos, ${discarded.length} descartes`,
);

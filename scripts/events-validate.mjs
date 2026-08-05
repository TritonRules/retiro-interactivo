#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEventList } from '../automation/validators/validate-events.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = JSON.parse(readFileSync(join(root, 'src/data/events.json'), 'utf8'));
const result = validateEventList(raw);
if (!result.ok) {
  console.error('Validación de eventos fallida:');
  for (const e of result.errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`OK events:validate — ${result.events.length} eventos`);

/**
 * Normaliza candidatos de lugares (coordenadas, slug, categoría).
 * No mezcla con publicados.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const path = join(root, 'data/candidates/places-candidates.json');
if (!existsSync(path)) {
  writeFileSync(path, '[]\n');
  console.log('OK normalize-places — sin candidatos');
  process.exit(0);
}
const raw = JSON.parse(readFileSync(path, 'utf8'));
const normalized = raw.map((item) => ({
  ...item,
  slug:
    item.slug ||
    String(item.name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
}));
writeFileSync(path, `${JSON.stringify(normalized, null, 2)}\n`);
console.log(`OK normalize-places — ${normalized.length} candidatos`);

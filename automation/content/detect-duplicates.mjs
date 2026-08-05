/**
 * Detecta duplicados por id/slug/proximidad/nombre entre publicados y candidatos.
 * No publica automáticamente.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function haversine(a, b) {
  const R = 6371000;
  const toR = (d) => (d * Math.PI) / 180;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function normName(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const places = JSON.parse(readFileSync(join(root, 'src/data/places.json'), 'utf8'));
const candidatesPath = join(root, 'data/candidates/places-candidates.json');
const candidates = existsSync(candidatesPath)
  ? JSON.parse(readFileSync(candidatesPath, 'utf8'))
  : [];

const pairs = [];
for (const c of candidates) {
  for (const p of places) {
    const reasons = [];
    if (c.id && c.id === p.id) reasons.push('id');
    if (c.slug && c.slug === p.slug) reasons.push('slug');
    if (normName(c.name) === normName(p.name)) reasons.push('name');
    if (c.coordinates && p.coordinates && haversine(c.coordinates, p.coordinates) < 35) {
      reasons.push('proximity<35m');
    }
    if (reasons.length) pairs.push({ candidate: c.id || c.name, place: p.id, reasons });
  }
}

mkdirSync(join(root, 'reports'), { recursive: true });
writeFileSync(
  join(root, 'reports/duplicates-report.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), pairs }, null, 2)}\n`,
);
console.log(`OK detect-duplicates — ${pairs.length} posibles duplicados`);

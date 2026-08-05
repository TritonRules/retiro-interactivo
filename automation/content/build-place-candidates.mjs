/**
 * Genera informe de candidatos de lugares (no publica).
 * Entrada opcional: data/candidates/places-candidates.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const candidatesPath = join(root, 'data/candidates/places-candidates.json');
const candidates = existsSync(candidatesPath)
  ? JSON.parse(readFileSync(candidatesPath, 'utf8'))
  : [];

mkdirSync(join(root, 'reports'), { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  candidateCount: candidates.length,
  note: 'Los candidatos no se mezclan con el contenido publicado hasta validación editorial.',
  sample: candidates.slice(0, 10),
};
writeFileSync(
  join(root, 'reports/content-import-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
if (!existsSync(candidatesPath)) {
  writeFileSync(candidatesPath, '[]\n');
}
console.log(`OK build-place-candidates — ${candidates.length} candidatos`);

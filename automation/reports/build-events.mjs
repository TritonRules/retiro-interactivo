/**
 * Pipeline completo de eventos: collect → normalize → dedupe → validate → publish → report.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectEvents } from '../collectors/madrid-open-data-agenda.mjs';
import { normalizeCollected } from '../normalizers/normalize-events.mjs';
import { deduplicateEvents } from '../deduplicators/deduplicate-events.mjs';
import { validateEventList } from '../validators/validate-events.mjs';
import {
  loadPreviousEvents,
  publishEventsAtomic,
} from '../publishers/publish-events.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');

function loadRegistry() {
  // Parser YAML mínimo para nuestro registro (líneas "- id:" + "  key: value")
  const raw = readFileSync(
    join(root, 'automation/sources/source-registry.yml'),
    'utf8',
  );
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
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      current[kv[1]] = val;
    }
  }
  if (current) items.push(current);
  return Object.fromEntries(items.map((i) => [i.id, i]));
}

function markExpired(events, now = new Date()) {
  return events.map((event) => {
    if (event.status !== 'published') return event;
    if (Date.parse(event.expiresAt) < now.getTime()) {
      return { ...event, status: 'expired' };
    }
    return event;
  });
}

export async function buildEvents({ offline = false } = {}) {
  const report = {
    ranAt: new Date().toISOString(),
    offline,
    steps: {},
    added: [],
    changed: [],
    removed: [],
    discarded: 0,
    duplicates: 0,
    errors: [],
    published: false,
    keptPrevious: false,
  };

  const previous = loadPreviousEvents();
  const registry = loadRegistry();

  let collected;
  try {
    collected = await collectEvents({ offline });
    report.steps.collect = 'ok';
  } catch (error) {
    report.steps.collect = 'error';
    report.errors.push(String(error.message ?? error));
    report.keptPrevious = true;
    report.publishedCount = previous.length;
    writeReport(report);
    console.error('ERROR: collect falló; se conserva la publicación anterior.');
    process.exitCode = 1;
    return report;
  }

  const { candidates, discarded } = normalizeCollected(collected, registry);
  report.steps.normalize = 'ok';
  report.discarded = discarded.length;
  report.discardSamples = discarded.slice(0, 15);

  const { events: deduped, duplicates } = deduplicateEvents(candidates);
  report.steps.dedupe = 'ok';
  report.duplicates = duplicates.length;
  report.duplicateSamples = duplicates.slice(0, 15);

  let events = markExpired(deduped);
  // Solo publicar published + needs-review no; filtramos a published vigentes y expired archivados
  const forPublish = events.filter(
    (e) => e.status === 'published' || e.status === 'expired',
  );

  const validation = validateEventList(forPublish);
  report.steps.validate = validation.ok ? 'ok' : 'error';
  if (!validation.ok) {
    report.errors.push(...validation.errors.slice(0, 40));
    report.keptPrevious = true;
    report.publishedCount = previous.length;
    writeReport(report);
    console.error('ERROR: validación fallida; no se publica.');
    process.exitCode = 1;
    return report;
  }

  // Diff
  const prevById = new Map(previous.map((e) => [e.id, e]));
  const nextById = new Map(validation.events.map((e) => [e.id, e]));
  for (const [id, event] of nextById) {
    if (!prevById.has(id)) report.added.push(id);
    else if (JSON.stringify(prevById.get(id)) !== JSON.stringify(event)) {
      report.changed.push(id);
    }
  }
  for (const id of prevById.keys()) {
    if (!nextById.has(id)) report.removed.push(id);
  }

  const publishResult = publishEventsAtomic(validation.events, {
    allowEmpty: previous.length === 0,
  });
  report.steps.publish = publishResult.published ? 'ok' : publishResult.reason;
  report.published = publishResult.published;
  report.keptPrevious = publishResult.keptPrevious;
  report.publishedCount = publishResult.count;
  report.publishedUpcoming = validation.events.filter(
    (e) => e.status === 'published' && Date.parse(e.expiresAt) >= Date.now(),
  ).length;

  writeReport(report);

  if (!publishResult.published) {
    console.error(`ERROR: publicación no aplicada (${publishResult.reason}).`);
    process.exitCode = 1;
    return report;
  }

  console.log(
    `OK events:build — ${report.publishedUpcoming} próximos / ${report.publishedCount} total, descartes=${report.discarded}, duplicados=${report.duplicates}`,
  );
  return report;
}

function writeReport(report) {
  mkdirSync(join(root, 'reports'), { recursive: true });
  mkdirSync(join(root, 'public/data'), { recursive: true });
  const body = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(join(root, 'reports/event-build-report.json'), body);
  writeFileSync(join(root, 'public/data/event-build-report.json'), body);
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain || process.argv[1]?.endsWith('build-events.mjs')) {
  const offline = process.argv.includes('--offline');
  buildEvents({ offline }).catch((error) => {
    console.error('ERROR events:build', error);
    process.exit(1);
  });
}

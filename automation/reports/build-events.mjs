/**
 * Pipeline completo de eventos: collect → normalize → dedupe → validate → publish → report.
 * Una recolección incompleta no publica ni declara frescura nueva.
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { collectEvents } from '../collectors/madrid-open-data-agenda.mjs';
import { normalizeCollected } from '../normalizers/normalize-events.mjs';
import { deduplicateEvents } from '../deduplicators/deduplicate-events.mjs';
import { validateEventList } from '../validators/validate-events.mjs';
import {
  loadPreviousEvents,
  loadPreviousPublication,
  publishEventsAtomic,
} from '../publishers/publish-events.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');

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

function writeAttemptReport(report) {
  mkdirSync(join(root, 'reports'), { recursive: true });
  mkdirSync(join(root, 'reports/iteracion-1'), { recursive: true });
  const body = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(join(root, 'reports/event-build-report.json'), body);
  const stamped = join(
    root,
    'reports/iteracion-1',
    `${report.ranAt.slice(0, 10)}-events-attempt.json`,
  );
  writeFileSync(stamped, body);
}

export async function buildEvents({ offline = false, rootDir, now = new Date() } = {}) {
  const report = {
    ranAt: now.toISOString(),
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
    collectComplete: false,
  };

  const previous = loadPreviousEvents(rootDir);
  const previousPublication = loadPreviousPublication(rootDir);
  const registry = loadRegistry();

  let collected;
  try {
    collected = await collectEvents({ offline, now });
    report.steps.collect = collected.every((item) => item.complete) ? 'ok' : 'incomplete';
    report.collectComplete = collected.every((item) => item.complete);
    report.sources = collected.map((item) => ({
      sourceId: item.sourceId,
      complete: item.complete,
      fromCache: item.fromCache,
      fetchedAt: item.fetchedAt,
      lastSuccessfulFetchAt: item.lastSuccessfulFetchAt,
      fetchError: item.fetchError,
      graphCount: Array.isArray(item.data?.['@graph']) ? item.data['@graph'].length : null,
    }));
  } catch (error) {
    report.steps.collect = 'error';
    report.errors.push(String(error.message ?? error));
    report.keptPrevious = true;
    report.publishedCount = previous.length;
    report.publication = previousPublication;
    writeAttemptReport(report);
    console.error('ERROR: collect falló; se conserva la publicación anterior.');
    process.exitCode = 1;
    return report;
  }

  if (!report.collectComplete) {
    report.steps.publish = 'skipped-incomplete-collect';
    report.keptPrevious = true;
    report.publishedCount = previous.length;
    report.publication = previousPublication;
    report.errors.push(
      'Recolección incompleta: no se publica ni se declara una consulta reciente.',
    );
    writeAttemptReport(report);
    console.error('ERROR: recolección incompleta; se conserva la publicación anterior.');
    process.exitCode = 1;
    return report;
  }

  const usable = collected.filter((item) => item.data);
  const { candidates, discarded } = normalizeCollected(usable, registry);
  report.steps.normalize = 'ok';
  report.discarded = discarded.length;
  report.discardSamples = discarded.slice(0, 15);

  const { events: deduped, duplicates } = deduplicateEvents(candidates);
  report.steps.dedupe = 'ok';
  report.duplicates = duplicates.length;
  report.duplicateSamples = duplicates.slice(0, 15);

  let events = markExpired(deduped, now);
  const forPublish = events.filter((e) =>
    ['published', 'expired', 'needs-review', 'cancelled', 'postponed'].includes(e.status),
  );

  const validation = validateEventList(forPublish);
  report.steps.validate = validation.ok ? 'ok' : 'error';
  if (!validation.ok) {
    report.errors.push(...validation.errors.slice(0, 40));
    report.keptPrevious = true;
    report.publishedCount = previous.length;
    report.publication = previousPublication;
    writeAttemptReport(report);
    console.error('ERROR: validación fallida; no se publica.');
    process.exitCode = 1;
    return report;
  }

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

  const publication = {
    schemaVersion: 1,
    publishedAt: now.toISOString(),
    datasetHash: createHash('sha256').update(JSON.stringify(validation.events)).digest('hex'),
    coverageHorizonDays: 90,
    sources: collected.map((item) => ({
      sourceId: item.sourceId,
      lastSuccessfulFetchAt: item.lastSuccessfulFetchAt,
      lastAttemptAt: item.lastAttemptAt,
      fromCache: item.fromCache,
      fetchError: item.fetchError,
    })),
  };

  const publishResult = publishEventsAtomic(validation.events, {
    allowEmpty: previous.length === 0,
    rootDir,
    publication,
    now,
  });
  report.steps.publish = publishResult.published ? 'ok' : publishResult.reason;
  report.published = publishResult.published;
  report.keptPrevious = publishResult.keptPrevious;
  report.publishedCount = publishResult.count;
  report.publication = publishResult.publication;
  report.publishedUpcoming = validation.events.filter(
    (e) => e.status === 'published' && Date.parse(e.expiresAt) >= now.getTime(),
  ).length;

  writeAttemptReport(report);
  if (publishResult.published) {
    mkdirSync(join(root, 'public/data'), { recursive: true });
    writeFileSync(
      join(root, 'public/data/event-build-report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );
  }

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

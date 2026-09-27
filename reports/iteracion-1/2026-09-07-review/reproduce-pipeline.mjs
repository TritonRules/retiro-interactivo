/**
 * Reproduce two acceptance-review defects using only simulated fetch responses
 * and temporary files. Assertions describe the observed defects, not desired
 * application behavior. Run from any directory with Node 22.
 */
import assert from 'node:assert/strict';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizeCollected } from '../../../automation/normalizers/normalize-events.mjs';
import { deduplicateEvents } from '../../../automation/deduplicators/deduplicate-events.mjs';
import { validateEventList } from '../../../automation/validators/validate-events.mjs';
import {
  datasetHash,
  publishEventsAtomic,
  toGeoJSON,
} from '../../../automation/publishers/publish-events.mjs';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const tempRoot = mkdtempSync(join(tmpdir(), 'retiro-review-pipeline-'));
const originalFetch = globalThis.fetch;
const now = new Date('2026-09-06T16:37:26.939Z');
const output = { review: '2026-09-07', mode: 'simulated-fetch-temporary-files', defects: [] };

function readJson(root, path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

try {
  // Copy the collector so its module-relative cache is also temporary.
  const collectorPath = join(tempRoot, 'collector/automation/collectors/madrid-open-data-agenda.mjs');
  mkdirSync(dirname(collectorPath), { recursive: true });
  copyFileSync(join(repoRoot, 'automation/collectors/madrid-open-data-agenda.mjs'), collectorPath);
  const { collectEvents } = await import(pathToFileURL(collectorPath).href);

  const raw = {
    id: 'valid',
    title: 'Actividad de prueba',
    dtstart: '2026-09-07 10:00:00.0',
    dtend: '2026-09-07 12:00:00.0',
    time: '10:00',
    'event-location': 'Casa de Vacas',
    link: 'https://www.madrid.es/',
  };
  globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    json: async () => String(url).includes('300107-')
      ? { '@graph': [raw] }
      : { error: 'schema changed' },
  });

  const collected = await collectEvents({ now });
  assert.equal(collected.length, 2);
  assert.ok(collected.every((source) => source.complete === true));
  assert.equal(collected[1].fetchedAt, now.toISOString());
  assert.equal(collected[1].data['@graph'], undefined);

  // These are the actual normalize/dedupe/validate/publish helpers invoked by
  // buildEvents after its collected.every(item => item.complete) check.
  const { candidates } = normalizeCollected(collected, {});
  const validation = validateEventList(deduplicateEvents(candidates).events);
  assert.equal(validation.ok, true);
  assert.equal(validation.events.length, 1);
  const eventA = validation.events[0];
  const lostEvent = { ...eventA, id: 'lost-other-source', slug: 'lost-other-source' };
  const partialRoot = join(tempRoot, 'partial-publication');
  assert.equal(publishEventsAtomic([eventA, lostEvent], { rootDir: partialRoot, now }).published, true);
  const partialResult = publishEventsAtomic(validation.events, { rootDir: partialRoot, now });
  const idsAfter = readJson(partialRoot, 'src/data/events.json').map((event) => event.id);
  assert.equal(partialResult.published, true);
  assert.equal(partialResult.keptPrevious, false);
  assert.deepEqual(idsAfter, ['evt-valid']);

  output.defects.push({
    id: 'http-200-invalid-source-publishes-partial-dataset',
    confirmed: true,
    collected: collected.map((source) => ({
      sourceId: source.sourceId,
      complete: source.complete,
      fetchedAt: source.fetchedAt,
      graphCount: Array.isArray(source.data?.['@graph']) ? source.data['@graph'].length : null,
    })),
    validationOk: validation.ok,
    published: partialResult.published,
    previousCount: 2,
    countAfter: idsAfter.length,
    idsAfter,
  });

  // Simulate migration from the baseline, which has three data files but no
  // events-publication.json files. Failure follows the source-metadata write.
  const rollbackRoot = join(tempRoot, 'metadata-migration');
  const oldEvents = JSON.parse(JSON.stringify([eventA]));
  const newEvents = [{ ...eventA, id: 'replacement', slug: 'replacement' }];
  for (const [path, payload] of [
    ['src/data/events.json', oldEvents],
    ['public/data/events.json', oldEvents],
    ['public/data/events.geojson', toGeoJSON(oldEvents)],
  ]) {
    const target = join(rollbackRoot, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
  }
  const rollbackResult = publishEventsAtomic(newEvents, {
    rootDir: rollbackRoot,
    now,
    failAfter: 4,
  });
  assert.equal(rollbackResult.published, false);
  assert.equal(rollbackResult.keptPrevious, true);
  assert.equal(rollbackResult.reason, 'write-failed:injected-failure');
  assert.deepEqual(readJson(rollbackRoot, 'src/data/events.json'), oldEvents);
  assert.deepEqual(readJson(rollbackRoot, 'public/data/events.json'), oldEvents);
  const retainedMetadata = readJson(rollbackRoot, 'src/data/events-publication.json');
  const actualDatasetHash = datasetHash(readJson(rollbackRoot, 'src/data/events.json'));
  assert.equal(retainedMetadata.datasetHash, datasetHash(newEvents));
  assert.notEqual(retainedMetadata.datasetHash, actualDatasetHash);
  assert.equal(existsSync(join(rollbackRoot, 'public/data/events-publication.json')), false);

  output.defects.push({
    id: 'rollback-retains-metadata-for-rejected-generation',
    confirmed: true,
    published: rollbackResult.published,
    keptPrevious: rollbackResult.keptPrevious,
    reason: rollbackResult.reason,
    restoredEventIds: readJson(rollbackRoot, 'src/data/events.json').map((event) => event.id),
    actualDatasetHash,
    retainedMetadataHash: retainedMetadata.datasetHash,
    publicMetadataExists: false,
  });
} finally {
  globalThis.fetch = originalFetch;
  rmSync(tempRoot, { recursive: true, force: true });
}

output.temporaryFilesRemoved = !existsSync(tempRoot);
assert.equal(output.temporaryFilesRemoved, true);
console.log(JSON.stringify(output, null, 2));

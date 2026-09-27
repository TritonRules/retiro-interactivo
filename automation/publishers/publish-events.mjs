/**
 * Publicación transaccional del conjunto de agenda:
 * JSON fuente, JSON público, GeoJSON y metadata de publicación.
 */
import {
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  cpSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultRoot = join(__dirname, '../..');

export function resolveRoot(rootDir) {
  return rootDir || defaultRoot;
}

export function datasetHash(events) {
  return createHash('sha256').update(JSON.stringify(events)).digest('hex');
}

export function loadPreviousEvents(rootDir) {
  const path = join(resolveRoot(rootDir), 'src/data/events.json');
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function loadPreviousPublication(rootDir) {
  const path = join(resolveRoot(rootDir), 'src/data/events-publication.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

export function toGeoJSON(events) {
  return {
    type: 'FeatureCollection',
    features: events
      .filter((e) => Array.isArray(e.coordinates))
      .map((e) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: e.coordinates },
        properties: {
          id: e.id,
          slug: e.slug,
          title: e.title,
          startAt: e.startAt,
          status: e.status,
          venue: e.venue,
        },
      })),
  };
}

function fileMap(root) {
  return {
    srcEvents: join(root, 'src/data/events.json'),
    publicEvents: join(root, 'public/data/events.json'),
    geo: join(root, 'public/data/events.geojson'),
    srcMeta: join(root, 'src/data/events-publication.json'),
    publicMeta: join(root, 'public/data/events-publication.json'),
  };
}

export function publishEventsAtomic(
  events,
  { allowEmpty = false, rootDir, publication, now = new Date(), failAfter = -1 } = {},
) {
  const root = resolveRoot(rootDir);
  const previous = loadPreviousEvents(rootDir);
  const previousPublication = loadPreviousPublication(rootDir);

  if (!Array.isArray(events)) {
    return {
      published: false,
      reason: 'payload-no-array',
      keptPrevious: true,
      count: previous.length,
      publication: previousPublication,
    };
  }

  if (events.length === 0 && previous.length > 0 && !allowEmpty) {
    return {
      published: false,
      reason: 'empty-guard',
      keptPrevious: true,
      count: previous.length,
      publication: previousPublication,
    };
  }

  const files = fileMap(root);
  mkdirSync(join(root, 'src/data'), { recursive: true });
  mkdirSync(join(root, 'public/data'), { recursive: true });

  const meta = publication || {
    schemaVersion: 1,
    publishedAt: now.toISOString(),
    datasetHash: datasetHash(events),
    coverageHorizonDays: 90,
    sources: [],
  };

  const payloads = [
    [files.srcEvents, `${JSON.stringify(events, null, 2)}\n`],
    [files.publicEvents, `${JSON.stringify(events, null, 2)}\n`],
    [files.geo, `${JSON.stringify(toGeoJSON(events), null, 2)}\n`],
    [files.srcMeta, `${JSON.stringify(meta, null, 2)}\n`],
    [files.publicMeta, `${JSON.stringify(meta, null, 2)}\n`],
  ];

  const staging = join(root, '.tmp-events-publish');
  const backup = join(root, '.tmp-events-backup');
  rmSync(staging, { recursive: true, force: true });
  rmSync(backup, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });

  try {
    mkdirSync(backup, { recursive: true });
    for (const [target] of payloads) {
      if (existsSync(target)) {
        const rel = relative(root, target);
        mkdirSync(dirname(join(backup, rel)), { recursive: true });
        cpSync(target, join(backup, rel));
      }
    }

    const staged = [];
    for (const [target, body] of payloads) {
      const rel = relative(root, target);
      const stagedPath = join(staging, rel);
      mkdirSync(dirname(stagedPath), { recursive: true });
      writeFileSync(stagedPath, body);
      staged.push([stagedPath, target, rel]);
    }

    for (const [index, [from, to, rel]] of staged.entries()) {
      if (failAfter === index) {
        throw new Error('injected-failure');
      }
      mkdirSync(dirname(to), { recursive: true });
      const tmp = `${to}.tmp`;
      cpSync(from, tmp);
      renameSync(tmp, to);
    }
  } catch (error) {
    for (const [target] of payloads) {
      const backupPath = join(backup, relative(root, target));
      if (existsSync(backupPath)) cpSync(backupPath, target);
    }
    rmSync(staging, { recursive: true, force: true });
    rmSync(backup, { recursive: true, force: true });
    return {
      published: false,
      reason: `write-failed:${error.message ?? error}`,
      keptPrevious: true,
      count: previous.length,
      publication: previousPublication,
    };
  }

  rmSync(staging, { recursive: true, force: true });
  rmSync(backup, { recursive: true, force: true });

  const previousBackup = join(root, 'automation/cache/events-previous.json');
  if (previous.length) {
    mkdirSync(dirname(previousBackup), { recursive: true });
    writeFileSync(previousBackup, `${JSON.stringify(previous, null, 2)}\n`);
  }

  return {
    published: true,
    reason: 'ok',
    keptPrevious: false,
    count: events.length,
    publication: meta,
  };
}

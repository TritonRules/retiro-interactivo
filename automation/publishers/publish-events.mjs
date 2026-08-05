/**
 * Publicación atómica de events.json + geojson.
 * Ante fallo o lista vacía inesperada, conserva la publicación anterior.
 */
import {
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');

export function loadPreviousEvents() {
  const path = join(root, 'src/data/events.json');
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
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

export function publishEventsAtomic(events, { allowEmpty = false } = {}) {
  const previous = loadPreviousEvents();

  if (!Array.isArray(events)) {
    return {
      published: false,
      reason: 'payload-no-array',
      keptPrevious: true,
      count: previous.length,
    };
  }

  if (events.length === 0 && previous.length > 0 && !allowEmpty) {
    return {
      published: false,
      reason: 'empty-guard',
      keptPrevious: true,
      count: previous.length,
    };
  }

  const targets = [
    join(root, 'src/data/events.json'),
    join(root, 'public/data/events.json'),
  ];
  const geoTargets = [
    join(root, 'public/data/events.geojson'),
  ];

  mkdirSync(join(root, 'public/data'), { recursive: true });
  const payload = `${JSON.stringify(events, null, 2)}\n`;
  const geoPayload = `${JSON.stringify(toGeoJSON(events), null, 2)}\n`;

  for (const target of targets) {
    const tmp = `${target}.tmp`;
    writeFileSync(tmp, payload);
    renameSync(tmp, target);
  }
  for (const target of geoTargets) {
    const tmp = `${target}.tmp`;
    writeFileSync(tmp, geoPayload);
    renameSync(tmp, target);
  }

  // Backup de la publicación anterior para recuperación
  if (previous.length) {
    const backup = join(root, 'automation/cache/events-previous.json');
    mkdirSync(dirname(backup), { recursive: true });
    writeFileSync(backup, `${JSON.stringify(previous, null, 2)}\n`);
  }

  return {
    published: true,
    reason: 'ok',
    keptPrevious: false,
    count: events.length,
  };
}

export function restorePreviousOnFailure() {
  const backup = join(root, 'automation/cache/events-previous.json');
  const current = join(root, 'src/data/events.json');
  if (!existsSync(current) && existsSync(backup)) {
    copyFileSync(backup, current);
    copyFileSync(backup, join(root, 'public/data/events.json'));
  }
}

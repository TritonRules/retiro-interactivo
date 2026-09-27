import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { publishEventsAtomic, loadPreviousEvents } from '../../automation/publishers/publish-events.mjs';

function seedRoot(eventsA, metaA) {
  const root = join(tmpdir(), `retiro-pub-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(join(root, 'src/data'), { recursive: true });
  mkdirSync(join(root, 'public/data'), { recursive: true });
  writeFileSync(join(root, 'src/data/events.json'), `${JSON.stringify(eventsA, null, 2)}\n`);
  writeFileSync(join(root, 'public/data/events.json'), `${JSON.stringify(eventsA, null, 2)}\n`);
  writeFileSync(join(root, 'public/data/events.geojson'), '{"type":"FeatureCollection","features":[]}\n');
  writeFileSync(join(root, 'src/data/events-publication.json'), `${JSON.stringify(metaA, null, 2)}\n`);
  writeFileSync(join(root, 'public/data/events-publication.json'), `${JSON.stringify(metaA, null, 2)}\n`);
  return root;
}

const eventA = {
  id: 'a',
  slug: 'a',
  title: 'A',
  coordinates: [-3.68, 40.41],
  startAt: '2026-09-06T10:00:00+02:00',
  status: 'published',
  venue: 'Retiro',
};
const eventB = { ...eventA, id: 'b', slug: 'b', title: 'B' };
const metaA = { schemaVersion: 1, publishedAt: '2026-08-06T00:00:00.000Z', datasetHash: 'aaa', sources: [] };
const metaB = { schemaVersion: 1, publishedAt: '2026-09-06T00:00:00.000Z', datasetHash: 'bbb', sources: [] };

describe('publicación transaccional del conjunto', () => {
  it('escribe JSON, geojson y metadata juntos', () => {
    const root = seedRoot([eventA], metaA);
    const result = publishEventsAtomic([eventB], { rootDir: root, publication: metaB, allowEmpty: true });
    expect(result.published).toBe(true);
    expect(JSON.parse(readFileSync(join(root, 'src/data/events.json'), 'utf8'))[0].id).toBe('b');
    expect(JSON.parse(readFileSync(join(root, 'public/data/events.json'), 'utf8'))[0].id).toBe('b');
    expect(JSON.parse(readFileSync(join(root, 'src/data/events-publication.json'), 'utf8')).datasetHash).toBe(
      'bbb',
    );
    expect(JSON.parse(readFileSync(join(root, 'public/data/events.geojson'), 'utf8')).features[0].properties.id).toBe(
      'b',
    );
    rmSync(root, { recursive: true, force: true });
  });

  it('ante un fallo intermedio restaura el conjunto anterior', () => {
    const root = seedRoot([eventA], metaA);
    const result = publishEventsAtomic([eventB], {
      rootDir: root,
      publication: metaB,
      failAfter: 1,
    });
    expect(result.published).toBe(false);
    expect(result.keptPrevious).toBe(true);
    expect(JSON.parse(readFileSync(join(root, 'src/data/events.json'), 'utf8'))[0].id).toBe('a');
    expect(JSON.parse(readFileSync(join(root, 'public/data/events.json'), 'utf8'))[0].id).toBe('a');
    expect(JSON.parse(readFileSync(join(root, 'src/data/events-publication.json'), 'utf8')).datasetHash).toBe(
      'aaa',
    );
    rmSync(root, { recursive: true, force: true });
  });

  it('no publica una lista vacía si hay previos', () => {
    const root = seedRoot([eventA], metaA);
    const result = publishEventsAtomic([], { rootDir: root });
    expect(result.published).toBe(false);
    expect(result.reason).toBe('empty-guard');
    expect(loadPreviousEvents(root)).toHaveLength(1);
    rmSync(root, { recursive: true, force: true });
  });
});

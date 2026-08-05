/**
 * Deduplicación de eventos entre datasets municipales.
 */
export function eventFingerprint(event) {
  const title = String(event.title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const day = String(event.startAt || '').slice(0, 10);
  const venue = String(event.venue || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return `${title}|${day}|${venue}`;
}

export function deduplicateEvents(events) {
  const bySourceId = new Map();
  const byFingerprint = new Map();
  const kept = [];
  const duplicates = [];

  for (const event of events) {
    if (event.sourceEventId) {
      const key = `${event.sourceEventId}`;
      if (bySourceId.has(key)) {
        duplicates.push({
          reason: 'sourceEventId',
          keptId: bySourceId.get(key).id,
          droppedId: event.id,
          sourceEventId: key,
        });
        continue;
      }
    }

    const fp = eventFingerprint(event);
    if (byFingerprint.has(fp)) {
      duplicates.push({
        reason: 'title-date-venue',
        keptId: byFingerprint.get(fp).id,
        droppedId: event.id,
        fingerprint: fp,
      });
      continue;
    }

    const clean = { ...event };
    delete clean._sourceDataset;
    kept.push(clean);
    if (event.sourceEventId) bySourceId.set(String(event.sourceEventId), clean);
    byFingerprint.set(fp, clean);
  }

  // Resolver colisiones de slug
  const slugCount = new Map();
  for (const event of kept) {
    const base = event.slug;
    const n = slugCount.get(base) || 0;
    slugCount.set(base, n + 1);
    if (n > 0) event.slug = `${base}-${n + 1}`;
  }

  return { events: kept, duplicates };
}

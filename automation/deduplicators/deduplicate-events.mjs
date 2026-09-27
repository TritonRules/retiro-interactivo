/**
 * Deduplicación de eventos entre datasets municipales.
 * La identidad de serie es sourceEventId. El fingerprint incluye la hora.
 */
function normalizeKey(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function eventFingerprint(event) {
  const title = normalizeKey(event.title);
  const start = String(event.startAt || '');
  const venue = normalizeKey(event.venue);
  const times = (event.schedule?.sessionTimes || []).join(',');
  return `${title}|${start}|${venue}|${times}`;
}

function mergeSchedule(kept, incoming) {
  const a = kept.schedule;
  const b = incoming.schedule;
  if (!a && !b) return kept.schedule;
  if (!a) return b;
  if (!b) return a;
  const excluded = [...new Set([
    ...(a.recurrence?.excludedDays || []),
    ...(b.recurrence?.excludedDays || []),
  ])].sort();
  const times = [...new Set([...(a.sessionTimes || []), ...(b.sessionTimes || [])])].sort();
  const rec = a.recurrence || b.recurrence;
  const parseIssues = [...new Set([...(a.parseIssues || []), ...(b.parseIssues || [])])];
  return {
    timePrecision: a.timePrecision === 'exact' || b.timePrecision === 'exact' ? 'exact' : a.timePrecision,
    sessionTimes: times,
    recurrence: rec
      ? { ...rec, excludedDays: excluded.length ? excluded : rec.excludedDays }
      : undefined,
    parseIssues: parseIssues.length ? parseIssues : undefined,
  };
}

function pickLastChecked(a, b) {
  const ta = Date.parse(a || '');
  const tb = Date.parse(b || '');
  if (Number.isNaN(ta)) return b;
  if (Number.isNaN(tb)) return a;
  return ta <= tb ? a : b;
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
        const previous = bySourceId.get(key);
        previous.schedule = mergeSchedule(previous, event);
        previous.lastCheckedAt = pickLastChecked(previous.lastCheckedAt, event.lastCheckedAt);
        if (!previous.coordinates && event.coordinates) previous.coordinates = event.coordinates;
        duplicates.push({
          reason: 'sourceEventId',
          keptId: previous.id,
          droppedId: event.id,
          sourceEventId: key,
          merged: true,
        });
        continue;
      }
    }

    const fp = eventFingerprint(event);
    if (byFingerprint.has(fp)) {
      duplicates.push({
        reason: 'title-start-venue',
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

  const slugCount = new Map();
  for (const event of kept) {
    const base = event.slug;
    const n = slugCount.get(base) || 0;
    slugCount.set(base, n + 1);
    if (n > 0) event.slug = `${base}-${n + 1}`;
  }

  return { events: kept, duplicates };
}

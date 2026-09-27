/**
 * Normalización, filtrado geográfico y candidatos de eventos Madrid Open Data.
 */
import { createHash } from 'node:crypto';
import { instantFromWallClock, scheduleFromSource } from '../lib/schedule-from-source.mjs';

const PARK_VENUE_PATTERNS = [
  /parque del retiro/i,
  /jardines del buen retiro/i,
  /buen retiro/i,
  /casa de vacas/i,
  /palacio de cristal/i,
  /palacio de velázquez/i,
  /palacio de velazquez/i,
  /centro de educaci[oó]n ambiental el retiro/i,
  /ciea.*retiro/i,
  /teatro de t[ií]teres/i,
  /biblioteca p[uú]blica municipal eugenio/i,
  /casa de fieras/i,
  /la rosaleda/i,
  /estanque grande/i,
  /caba[nñ]a del retiro/i,
  /aula ambiental/i,
];

const RETIRO_BBOX = {
  minLon: -3.696,
  minLat: 40.405,
  maxLon: -3.672,
  maxLat: 40.427,
};

/**
 * Coordenadas curatoriales alineadas al catálogo OSM del proyecto.
 * Se priorizan frente a lat/lon municipales cuando el venue es conocido,
 * porque algunos datasets asignan un punto genérico incorrecto (p. ej. CIEA).
 */
const VENUE_COORDS = {
  'centro de educacion ambiental el retiro': [-3.68618, 40.409435],
  'centro cultural casa de vacas': [-3.6840988, 40.4192106],
  'casa de vacas': [-3.6840988, 40.4192106],
  'palacio de cristal': [-3.68206, 40.4136],
  'palacio de velazquez': [-3.68198, 40.4152],
  'teatro de titeres de el retiro': [-3.6866962, 40.4187197],
  'teatro de titeres': [-3.6866962, 40.4187197],
  'biblioteca publica municipal eugenio trias': [-3.6789381, 40.4167401],
  'casa de fieras': [-3.6789381, 40.4167401],
  'parque del retiro': [-3.6835, 40.4155],
  'jardines del buen retiro': [-3.6835, 40.4155],
  'jardines de el buen retiro': [-3.6835, 40.4155],
  'aula ambiental la cabana del retiro': [-3.679318, 40.409123],
  'cabana del retiro': [-3.679318, 40.409123],
};

export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

/** Interpreta dtstart/dtend de Madrid Open Data → ISO Europe/Madrid. */
export function parseMadridDateTime(raw) {
  const parsed = instantFromWallClock(raw);
  return parsed.ok ? parsed.iso : null;
}

export function parseMadridDateTimeDetailed(raw) {
  return instantFromWallClock(raw);
}

export function extractCoords(raw) {
  const loc = raw.location;
  if (loc?.latitude && loc?.longitude) {
    return [Number(loc.longitude), Number(loc.latitude)];
  }
  const addr = raw.address;
  if (addr?.latitude && addr?.longitude) {
    return [Number(addr.longitude), Number(addr.latitude)];
  }
  return null;
}

export function inRetiroBbox(coords) {
  if (!coords) return false;
  const [lon, lat] = coords;
  return (
    lon >= RETIRO_BBOX.minLon &&
    lon <= RETIRO_BBOX.maxLon &&
    lat >= RETIRO_BBOX.minLat &&
    lat <= RETIRO_BBOX.maxLat
  );
}

export function matchesParkVenue(text) {
  if (!text) return false;
  return PARK_VENUE_PATTERNS.some((re) => re.test(text));
}

export function isDistrictRetiroOnly(raw, blob) {
  const districtId = raw?.address?.district?.['@id'] ?? '';
  const isDistrict = /Distrito\/Retiro/i.test(districtId) || /distrito retiro/i.test(blob);
  const parkHit = matchesParkVenue(blob);
  return isDistrict && !parkHit;
}

function normalizeKey(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Devuelve coords curatoriales si el venue es conocido. */
export function curatedVenueCoords(venue) {
  const key = normalizeKey(venue);
  for (const [name, c] of Object.entries(VENUE_COORDS)) {
    if (key.includes(name)) return c;
  }
  return undefined;
}

/**
 * Prioriza coordenadas curatoriales de sedes conocidas.
 * Si no hay sede conocida, usa las de la fuente solo si caen en el bbox.
 */
export function resolveVenueCoords(venue, coords) {
  const curated = curatedVenueCoords(venue);
  if (curated) return curated;
  if (coords && inRetiroBbox(coords)) return coords;
  return undefined;
}

export function geographicGate(raw) {
  const venue = raw['event-location'] || raw.address?.area?.['street-address'] || '';
  const blob = JSON.stringify(raw);
  const coords = extractCoords(raw);
  const reasons = [];
  const resolved = resolveVenueCoords(venue, coords);

  if (matchesParkVenue(venue) || matchesParkVenue(blob)) {
    if (resolved || matchesParkVenue(venue)) {
      return {
        accept: true,
        reason: curatedVenueCoords(venue) ? 'venue-curated' : 'venue-park',
        coords: resolved,
        venue: venue || 'Parque del Retiro',
      };
    }
  }
  if (isDistrictRetiroOnly(raw, blob)) {
    return { accept: false, reason: 'distrito-retiro-sin-parque', coords, venue };
  }
  if (coords && inRetiroBbox(coords) && /retiro/i.test(blob) && matchesParkVenue(blob)) {
    return {
      accept: true,
      reason: 'coords+venue',
      coords: resolved || coords,
      venue,
    };
  }
  if (coords && inRetiroBbox(coords) && /retiro/i.test(blob)) {
    // Keyword genérico + bbox: aceptar solo con coords; marcar razón débil.
    return { accept: true, reason: 'bbox-retiro-keyword', coords: resolved || coords, venue };
  }
  reasons.push('fuera-ambito');
  return { accept: false, reason: reasons[0], coords, venue };
}

export function normalizeRawEvent(raw, sourceId, sourceMeta, checkContext = {}) {
  const gate = geographicGate(raw);
  const title = String(raw.title || '').trim();
  const startDetailed = instantFromWallClock(raw.dtstart);
  const endDetailed = raw.dtend ? instantFromWallClock(raw.dtend) : { ok: false };
  let startAt = startDetailed.ok ? startDetailed.iso : null;
  const endAt = endDetailed.ok ? endDetailed.iso : undefined;
  const sourceEventId = String(raw.id || raw.uid || '');
  const discard = [];
  const parseIssues = [];

  if (!gate.accept) discard.push(gate.reason);
  if (!title) discard.push('sin-titulo');
  if (!startAt) {
    if (startDetailed.reason === 'nonexistent' || startDetailed.reason === 'ambiguous') {
      parseIssues.push(`dtstart-${startDetailed.reason}`);
      const day = String(raw.dtstart || '').slice(0, 10);
      const noon = instantFromWallClock(`${day}T12:00:00`);
      startAt = noon.ok ? noon.iso : null;
    }
    if (!startAt) discard.push('sin-fecha');
  }
  if (!gate.venue && !gate.coords) discard.push('sin-localizacion');

  if (discard.length) {
    return {
      discarded: true,
      discardReasons: discard,
      sourceId,
      sourceEventId,
      title: title || null,
    };
  }

  const link = raw.link || sourceMeta.landing || sourceMeta.url;
  const slugBase = slugify(`${title}-${sourceEventId || startAt.slice(0, 10)}`);
  const id = `evt-${sourceEventId || createHash('sha1').update(`${title}|${startAt}|${gate.venue}`).digest('hex').slice(0, 12)}`;

  let priceNote;
  if (raw.free === 1 || raw.free === '1') priceNote = 'Gratuito según fuente municipal';
  else if (raw.price) priceNote = String(raw.price);

  const audience = raw.audience
    ? String(raw.audience)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  const category =
    typeof raw['@type'] === 'string'
      ? raw['@type'].split('/').pop() || 'actividad'
      : 'actividad';

  const { schedule, untilExclusive, parseIssues: scheduleIssues } = scheduleFromSource(
    raw,
    startAt,
    endAt,
  );
  parseIssues.push(...scheduleIssues);
  if (parseIssues.length) {
    schedule.parseIssues = [...new Set([...(schedule.parseIssues || []), ...parseIssues])];
  }

  const status = parseIssues.length ? 'needs-review' : 'published';
  const lastCheckedAt = checkContext.lastSuccessfulFetchAt || undefined;

  const shortDescription = String(raw.description || title)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);

  return {
    discarded: false,
    event: {
      id,
      slug: slugBase || id,
      title,
      shortDescription: shortDescription.length >= 5 ? shortDescription : title,
      startAt,
      endAt,
      venue: gate.venue || 'Parque del Retiro',
      coordinates: gate.coords,
      category,
      audience,
      priceNote,
      registrationUrl: link && /^https?:/i.test(link) ? link : undefined,
      sourceName: sourceMeta.name,
      sourceUrl: link && /^https?:/i.test(link) ? link : sourceMeta.url,
      sourceTier: 'A',
      sourceEventId: sourceEventId || undefined,
      lastCheckedAt,
      expiresAt: untilExclusive || endAt || startAt,
      confidence: gate.coords ? 0.9 : 0.75,
      status,
      schedule,
    },
  };
}

export function normalizeCollected(collected, registryById) {
  const candidates = [];
  const discarded = [];

  for (const batch of collected) {
    const meta = registryById[batch.sourceId] || {
      name: batch.sourceId,
      url: '',
    };
    const checkContext = {
      lastSuccessfulFetchAt: batch.fromCache ? null : batch.fetchedAt,
    };
    const graph = batch.data?.['@graph'] || [];
    for (const raw of graph) {
      const result = normalizeRawEvent(raw, batch.sourceId, meta, checkContext);
      if (result.discarded) discarded.push(result);
      else candidates.push({ ...result.event, _sourceDataset: batch.sourceId });
    }
  }

  return { candidates, discarded };
}

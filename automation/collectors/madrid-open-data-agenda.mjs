/**
 * Recolector Madrid Open Data — agendas municipales (tier A).
 * Un fallo no se presenta como consulta reciente. La caché no acredita frescura.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const cacheDir = join(root, 'automation/cache');

const USER_AGENT =
  'RetiroInteractivo/0.3 (+https://github.com/TritonRules; agenda educativa; contacto via repo)';

const SOURCES = [
  {
    id: 'madrid-agenda-general',
    url: 'https://datos.madrid.es/egob/catalogo/300107-0-agenda-actividades-eventos.json',
  },
  {
    id: 'madrid-agenda-cultural-100',
    url: 'https://datos.madrid.es/egob/catalogo/206974-0-agenda-eventos-culturales-100.json',
  },
];

function readCacheMeta(sourceId) {
  const metaPath = join(cacheDir, `${sourceId}.meta.json`);
  if (!existsSync(metaPath)) return null;
  try {
    return JSON.parse(readFileSync(metaPath, 'utf8'));
  } catch {
    return null;
  }
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.json();
    } catch (error) {
      lastError = error;
      const backoff = 500 * 2 ** i;
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastError;
}

export async function collectEvents({ offline = false, now = new Date() } = {}) {
  mkdirSync(cacheDir, { recursive: true });
  const collected = [];
  const attemptedAt = now.toISOString();

  for (const source of SOURCES) {
    const cachePath = join(cacheDir, `${source.id}.json`);
    if (offline) {
      if (!existsSync(cachePath)) {
        collected.push({
          sourceId: source.id,
          data: null,
          fromCache: true,
          complete: false,
          fetchedAt: null,
          lastSuccessfulFetchAt: readCacheMeta(source.id)?.fetchedAt ?? null,
          lastAttemptAt: attemptedAt,
          fetchError: 'offline-without-usable-success',
        });
        continue;
      }
      const data = JSON.parse(readFileSync(cachePath, 'utf8'));
      collected.push({
        sourceId: source.id,
        data,
        fromCache: true,
        complete: false,
        fetchedAt: null,
        lastSuccessfulFetchAt: readCacheMeta(source.id)?.fetchedAt ?? null,
        lastAttemptAt: attemptedAt,
        fetchError: 'offline',
      });
      continue;
    }
    try {
      const data = await fetchWithRetry(source.url);
      writeFileSync(cachePath, JSON.stringify(data));
      const metaPath = join(cacheDir, `${source.id}.meta.json`);
      const meta = {
        sourceId: source.id,
        url: source.url,
        fetchedAt: attemptedAt,
        bytes: Buffer.byteLength(JSON.stringify(data)),
      };
      writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      collected.push({
        sourceId: source.id,
        data,
        fromCache: false,
        complete: true,
        fetchedAt: attemptedAt,
        lastSuccessfulFetchAt: attemptedAt,
        lastAttemptAt: attemptedAt,
        fetchError: null,
      });
    } catch (error) {
      const message = String(error.message ?? error);
      if (existsSync(cachePath)) {
        console.warn(`Aviso: fallo de red en ${source.id}. No se acredita consulta reciente.`);
        const data = JSON.parse(readFileSync(cachePath, 'utf8'));
        collected.push({
          sourceId: source.id,
          data,
          fromCache: true,
          complete: false,
          fetchedAt: null,
          lastSuccessfulFetchAt: readCacheMeta(source.id)?.fetchedAt ?? null,
          lastAttemptAt: attemptedAt,
          fetchError: message,
        });
      } else {
        collected.push({
          sourceId: source.id,
          data: null,
          fromCache: false,
          complete: false,
          fetchedAt: null,
          lastSuccessfulFetchAt: null,
          lastAttemptAt: attemptedAt,
          fetchError: message,
        });
      }
    }
  }

  const manifestPath = join(cacheDir, 'collect-manifest.json');
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        collectedAt: attemptedAt,
        complete: collected.every((item) => item.complete),
        sources: collected.map((c) => ({
          sourceId: c.sourceId,
          fromCache: c.fromCache,
          complete: c.complete,
          fetchedAt: c.fetchedAt,
          lastSuccessfulFetchAt: c.lastSuccessfulFetchAt,
          graphCount: Array.isArray(c.data?.['@graph']) ? c.data['@graph'].length : null,
          fetchError: c.fetchError ?? null,
        })),
      },
      null,
      2,
    ),
  );

  return collected;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const offline = process.argv.includes('--offline');
  collectEvents({ offline })
    .then((items) => {
      console.log(
        `OK collect: ${items.length} fuentes`,
        items.map((i) => `${i.sourceId}${i.complete ? '' : ' (incompleta)'}`).join(', '),
      );
      if (!items.every((i) => i.complete)) process.exitCode = 2;
    })
    .catch((error) => {
      console.error('ERROR collect:', error.message ?? error);
      process.exit(1);
    });
}

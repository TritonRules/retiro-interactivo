/**
 * Recolector Madrid Open Data — agendas municipales (tier A).
 * Guarda JSON crudo solo en automation/cache/ (gitignored).
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

export async function collectEvents({ offline = false } = {}) {
  mkdirSync(cacheDir, { recursive: true });
  const collected = [];

  for (const source of SOURCES) {
    const cachePath = join(cacheDir, `${source.id}.json`);
    if (offline) {
      if (!existsSync(cachePath)) {
        throw new Error(`Modo offline sin caché: ${cachePath}`);
      }
      const data = JSON.parse(readFileSync(cachePath, 'utf8'));
      collected.push({ sourceId: source.id, data, fromCache: true });
      continue;
    }
    try {
      const data = await fetchWithRetry(source.url);
      writeFileSync(cachePath, JSON.stringify(data));
      const metaPath = join(cacheDir, `${source.id}.meta.json`);
      writeFileSync(
        metaPath,
        JSON.stringify(
          {
            sourceId: source.id,
            url: source.url,
            fetchedAt: new Date().toISOString(),
            bytes: Buffer.byteLength(JSON.stringify(data)),
          },
          null,
          2,
        ),
      );
      collected.push({ sourceId: source.id, data, fromCache: false });
    } catch (error) {
      if (existsSync(cachePath)) {
        console.warn(
          `Aviso: fallo de red en ${source.id}, usando caché local. ${error.message ?? error}`,
        );
        const data = JSON.parse(readFileSync(cachePath, 'utf8'));
        collected.push({ sourceId: source.id, data, fromCache: true, fetchError: String(error) });
      } else {
        throw error;
      }
    }
  }

  const manifestPath = join(cacheDir, 'collect-manifest.json');
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        collectedAt: new Date().toISOString(),
        sources: collected.map((c) => ({
          sourceId: c.sourceId,
          fromCache: c.fromCache,
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
        items.map((i) => `${i.sourceId}${i.fromCache ? ' (cache)' : ''}`).join(', '),
      );
    })
    .catch((error) => {
      console.error('ERROR collect:', error.message ?? error);
      process.exit(1);
    });
}

#!/usr/bin/env node
/**
 * Servidor estático sin fallback SPA: un HTML inexistente es 404, no el mapa.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = process.argv[2];
const port = Number(process.argv[3] || 4177);
const base = '/retiro-interactivo';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

function resolvePath(urlPath) {
  let pathname = decodeURIComponent(urlPath.split('?')[0]);
  if (pathname === base || pathname === `${base}/`) pathname = '/';
  else if (pathname.startsWith(`${base}/`)) pathname = pathname.slice(base.length);
  if (pathname.includes('\0') || pathname.includes('..')) return null;
  let file = join(root, pathname.replace(/^\//, ''));
  file = normalize(file);
  if (!file.startsWith(normalize(root))) return null;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  return file;
}

const server = createServer((req, res) => {
  const file = resolvePath(req.url || '/');
  if (!file || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404');
    return;
  }
  const body = readFileSync(file);
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(body);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`static ${root} → http://127.0.0.1:${port}${base}/`);
});

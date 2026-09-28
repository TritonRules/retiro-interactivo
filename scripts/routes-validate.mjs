#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const places = JSON.parse(readFileSync(join(root, 'src/data/places.json'), 'utf8'));
const routes = JSON.parse(readFileSync(join(root, 'src/data/routes.json'), 'utf8'));
const placeIds = new Set(places.map((p) => p.id));
let ok = true;
if (routes.length !== 6) {
  console.error(`Se esperaban 6 rutas, hay ${routes.length}`);
  ok = false;
}
for (const route of routes) {
  for (const id of route.stopIds) {
    if (!placeIds.has(id)) {
      console.error(`Ruta ${route.slug}: stopId inexistente ${id}`);
      ok = false;
    }
  }
  if (!route.geometry?.coordinates || route.geometry.coordinates.length < 2) {
    console.error(`Ruta ${route.slug}: geometría inválida`);
    ok = false;
  }
  if (route.approximateDistanceMeters < 400 || route.approximateDistanceMeters > 12000) {
    console.error(`Ruta ${route.slug}: distancia sospechosa ${route.approximateDistanceMeters}`);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log(`OK routes:validate — ${routes.length} rutas`);

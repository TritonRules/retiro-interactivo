#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function run(env) {
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run({
  E2E_FIXTURE: '1',
  ASTRO_OUT_DIR: 'dist-e2e',
  BASE: '/retiro-interactivo',
  SITE: 'https://e2e.retiro.test',
});

if (!existsSync(join(root, 'dist', 'index.html'))) {
  run({
    ASTRO_OUT_DIR: 'dist',
    BASE: '/retiro-interactivo',
    SITE: 'https://tritonrules.github.io',
  });
}

console.log('E2E builds listos: dist-e2e (fixtures) y dist (candidato).');

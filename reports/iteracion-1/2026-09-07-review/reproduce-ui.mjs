// Reproduce defects in the reviewed candidate; these assertions describe bugs,
// not the desired acceptance criteria. Run from the repository root.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const root = process.cwd();
const built = await build({
  entryPoints: [`${root}/src/utils/useParkClock.ts`],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['react'],
  write: false,
});

let now = Date.parse('2026-09-07T11:59:00+02:00');
const effects = [];
const scheduled = [];
const stateUpdates = [];
class ReviewDate extends Date {
  static now() { return now; }
}
const module = { exports: {} };
runInNewContext(built.outputFiles[0].text, {
  module,
  exports: module.exports,
  Date: ReviewDate,
  require: (id) => {
    assert.equal(id, 'react');
    return {
      useState: (initial) => [initial(), (value) => stateUpdates.push(value)],
      useEffect: (effect) => effects.push(effect),
    };
  },
  window: {
    clearTimeout() {},
    setTimeout(callback, delay) {
      scheduled.push({ callback, delay, dueAt: now + delay });
      return scheduled.length;
    },
    addEventListener() {},
    removeEventListener() {},
  },
  document: {
    visibilityState: 'visible',
    addEventListener() {},
    removeEventListener() {},
  },
});

const initial = module.exports.useParkClock();
effects.forEach((effect) => effect());
assert.equal(scheduled.length, 1);
assert.equal(scheduled[0].delay, 3_600_000);
now = Date.parse('2026-09-07T12:00:00+02:00');
assert.ok(scheduled[0].dueAt > now);
assert.equal(stateUpdates.length, 0);
console.log(JSON.stringify({
  case: 'clock-boundary',
  openedAt: new Date(initial).toISOString(),
  eventEndsAt: new Date(now).toISOString(),
  nextClockUpdateAt: new Date(scheduled[0].dueAt).toISOString(),
  updatesByEventEnd: stateUpdates.length,
  limitation: 'Hook with mocked React effects and timers; no browser rendering claimed.',
}, null, 2));

const html = readFileSync(`${root}/dist/agenda/index.html`, 'utf8');
const islands = html.match(/<astro-island\b[\s\S]*?<\/astro-island>/g) ?? [];
const agenda = islands.find((island) => island.includes('AgendaExplorer'));
assert.ok(agenda, 'Build the real static candidate before running this script.');
assert.match(agenda, /<h2[^>]*id="hoy-title"[^>]*>Hoy<\/h2>/);
assert.match(agenda, /<select\b/);
assert.match(html, /<noscript>/);
console.log(JSON.stringify({
  case: 'static-ssr-and-noscript',
  todayHeadingOutsideNoscript: true,
  filterSelectOutsideNoscript: true,
  fallbackAlsoPresent: true,
  limitation: 'HTML inspection; source/CSS review confirms no no-script hiding rule.',
}, null, 2));

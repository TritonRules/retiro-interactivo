/**
 * Reproducciones de auditoría, 7 de septiembre de 2026.
 * Las aserciones comprueban el defecto observado, no el comportamiento deseado.
 * Si se corrige el producto, este script debe dejar de pasar y revisarse.
 * Solo lee módulos/datos del producto. El bundle esbuild vive en memoria.
 * Ejecutar desde cualquier directorio: node /ruta/al/repositorio/reports/iteracion-1/2026-09-07-review/temporal-repro.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { normalizeRawEvent } from '../../../automation/normalizers/normalize-events.mjs';
import { validateEventList } from '../../../automation/validators/validate-events.mjs';
import { parseMadridWallClock, formatMadridTime } from '../../../src/utils/madridTime.shared.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const bundle = await build({
  stdin: {
    contents: [
      "export * from './src/utils/eventSchedule.ts';",
      "export * from './src/utils/eventFreshness.ts';",
      "export * from './src/utils/validateEvents.ts';",
      "export * from './src/utils/eventPresentation.ts';",
    ].join('\n'),
    resolveDir: root,
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const domain = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);

const base = {
  id: 'audit-synthetic',
  slug: 'audit-synthetic',
  title: 'Evento sintético de auditoría',
  shortDescription: 'Entrada sintética: no pertenece a la agenda municipal.',
  venue: 'Parque del Retiro',
  category: 'actividad',
  sourceName: 'Fuente sintética de auditoría',
  sourceUrl: 'https://www.madrid.es/',
  sourceTier: 'A',
  lastCheckedAt: '2026-09-06T18:00:00Z',
  confidence: 0.9,
  status: 'published',
};

function normalizeSynthetic(raw) {
  const result = normalizeRawEvent(
    {
      id: 'audit-synthetic',
      title: base.title,
      description: base.shortDescription,
      'event-location': base.venue,
      ...raw,
    },
    'audit-synthetic-source',
    { name: base.sourceName, url: base.sourceUrl },
    { lastSuccessfulFetchAt: base.lastCheckedAt },
  );
  assert.equal(result.discarded, false);
  return result.event;
}

const findings = [];

// T1. ÚNICO CASO REAL: registro BIC leído del dataset candidato.
const events = JSON.parse(readFileSync(new URL('../../../src/data/events.json', import.meta.url), 'utf8'));
const bic = events.find((event) => event.id === 'evt-50346030');
assert.ok(bic, 'Debe existir el registro real BIC evt-50346030');
const bicNow = Date.parse('2026-09-06T23:30:00+02:00');
const [bicToday] = domain.todaysSessions(bic, bicNow);
assert.ok(bicToday);
assert.equal(bicToday.session.endKnown, false);
assert.equal(bicToday.state, 'in-progress');
const bicBadge = domain.sessionBadge(bicToday.state, domain.eventTimePrecision(bic));
assert.equal(bicBadge, 'En curso');
findings.push({
  id: 'T1', provenance: 'REAL: src/data/events.json',
  eventId: bic.id, title: bic.title, now: '2026-09-06T23:30:00+02:00',
  observed: { endKnown: bicToday.session.endKnown, state: bicToday.state, badge: bicBadge },
  expected: 'No afirmar En curso cuando el fin solo es una ventana de visibilidad.',
  locations: ['src/utils/eventPresentation.ts:33', 'src/utils/eventSchedule.ts:245'],
});

// T2. Casos sintéticos: ausencia de fin con hora y con fecha sin hora.
const noEnd = normalizeSynthetic({ dtstart: '2026-09-07 10:00:00' });
assert.equal(noEnd.expiresAt, noEnd.startAt);
const noEndCurrent = domain.selectCurrentPlans([noEnd], Date.parse('2026-09-07T11:00:00+02:00'));
assert.equal(noEndCurrent.length, 0);
const noEndDate = normalizeSynthetic({ dtstart: '2026-09-07', time: '' });
const noEndDateSessions = domain.sessionsOnMadridDay(noEndDate, '2026-09-07');
assert.equal(noEndDateSessions.length, 0);
const dstNoEnd = normalizeSynthetic({ dtstart: '2026-10-25 00:30:00' });
assert.equal(dstNoEnd.expiresAt, '2026-10-25T00:30:00+02:00');
findings.push({
  id: 'T2', provenance: 'SYNTHETIC',
  observed: { startAt: noEnd.startAt, expiresAt: noEnd.expiresAt, currentAt1100: noEndCurrent.length, dateOnlySessions: noEndDateSessions.length, autumnExpiresAt: dstNoEnd.expiresAt },
  expected: 'Sin dtend, expiresAt debe ser la siguiente medianoche Madrid; en el caso de otoño, 2026-10-26T00:00:00+01:00.',
  locations: ['automation/normalizers/normalize-events.mjs:265'],
});

// T3. Casos sintéticos: offset explícito con recurrencia y fecha + time único.
const offsetSeries = normalizeSynthetic({
  dtstart: '2026-09-06T10:00:00+02:00', dtend: '2026-09-08T23:59:00+02:00',
  recurrence: { frequency: 'DAILY', days: 'MO,TU,WE,TH,FR,SA,SU', interval: 1 },
});
const [offsetSession] = domain.sessionsOnMadridDay(offsetSeries, '2026-09-07');
assert.ok(offsetSession);
const offsetHour = formatMadridTime(new Date(offsetSession.startMs).toISOString());
assert.equal(offsetHour, '08:00');
const datePlusTime = normalizeSynthetic({ dtstart: '2026-09-07', time: '18:00', dtend: '2026-09-07 23:59:00' });
const [dateSession] = domain.sessionsOnMadridDay(datePlusTime, '2026-09-07');
assert.deepEqual(datePlusTime.schedule.sessionTimes, ['18:00']);
assert.ok(dateSession);
const dateHour = formatMadridTime(new Date(dateSession.startMs).toISOString());
assert.equal(dateHour, '00:00');
findings.push({
  id: 'T3', provenance: 'SYNTHETIC',
  observed: { offsetSeriesStart: offsetSeries.startAt, offsetSeriesMadridHour: offsetHour, datePlusTimeSchedule: datePlusTime.schedule.sessionTimes, datePlusTimeMadridHour: dateHour },
  expected: 'El pase de serie debe ser a las 10:00 Madrid; la fecha con time=18:00 debe generar el pase a las 18:00.',
  locations: ['src/utils/eventSchedule.ts:93', 'src/utils/eventSchedule.ts:228'],
});

// T4. Casos sintéticos: fechas inválidas o ambiguas que no bloquean publicación.
const validShape = { ...base, startAt: '2026-09-06T10:00:00+02:00', endAt: '2026-09-06T11:00:00+02:00', expiresAt: '2026-09-07T00:00:00+02:00' };
const validationCases = [
  { mutation: { endAt: 'this is invalid' }, expectedTs: true, expectedCli: true },
  { mutation: { startAt: '2026-02-30T10:00:00+01:00' }, expectedTs: true, expectedCli: true },
  { mutation: { endAt: '2026-09-01T11:00:00+02:00' }, expectedTs: false, expectedCli: true },
  { mutation: { lastCheckedAt: 'this is invalid' }, expectedTs: false, expectedCli: true },
].map(({ mutation, expectedTs, expectedCli }) => {
  const input = { ...validShape, ...mutation };
  const tsAccepted = domain.validateEvents([input]).ok;
  const cliAccepted = validateEventList([input]).ok;
  assert.equal(tsAccepted, expectedTs);
  assert.equal(cliAccepted, expectedCli);
  return { mutation, tsAccepted, cliAccepted };
});
const invalidCivil = parseMadridWallClock('2026-02-30T10:00:00+01:00');
assert.equal(invalidCivil.ok, true);
assert.equal(invalidCivil.iso, '2026-03-02T09:00:00+00:00');
const ambiguousEnd = normalizeSynthetic({ dtstart: '2026-09-07 10:00:00', dtend: '2026-10-25 02:30:00' });
assert.equal(ambiguousEnd.status, 'published');
assert.equal(ambiguousEnd.endAt, undefined);
assert.equal(ambiguousEnd.schedule.parseIssues, undefined);
findings.push({
  id: 'T4', provenance: 'SYNTHETIC',
  observed: { validationCases, invalidCivilNormalized: invalidCivil.iso, ambiguousEnd: { status: ambiguousEnd.status, endAt: ambiguousEnd.endAt ?? null, parseIssues: ambiguousEnd.schedule.parseIssues ?? null } },
  expected: 'Rechazar fechas imposibles/invalidas y fin anterior al inicio; dtend ambigua debe generar revisión explícita.',
  locations: ['src/utils/validateEvents.ts:85', 'automation/validators/validate-events.mjs:65', 'src/utils/madridTime.shared.mjs:103', 'automation/normalizers/normalize-events.mjs:177'],
});

// T5. Caso sintético: periodo sin regla no acredita una sesión continua.
const noRule = {
  ...base, startAt: '2026-09-06T10:00:00+02:00', endAt: '2026-09-09T11:00:00+02:00',
  expiresAt: '2026-09-09T11:00:00+02:00', schedule: { timePrecision: 'exact', sessionTimes: ['10:00'] },
};
const noRuleNow = Date.parse('2026-09-07T10:00:00+02:00');
const noRuleSessions = domain.sessionsOnMadridDay(noRule, '2026-09-07');
const noRuleNext = domain.nextValidSession(noRule, noRuleNow);
const noRuleCurrent = domain.selectCurrentPlans([noRule], noRuleNow);
assert.equal(noRuleSessions.length, 0);
assert.ok(noRuleNext);
assert.equal(noRuleNext.dayKey, '2026-09-06');
assert.equal(noRuleNext.endMs, Date.parse(noRule.endAt));
assert.equal(noRuleCurrent.length, 1);
findings.push({
  id: 'T5', provenance: 'SYNTHETIC',
  observed: { sessionsOnSeptember7: noRuleSessions.length, nextSession: noRuleNext, currentPlans: noRuleCurrent.length },
  expected: 'No ofrecer una sesión continua del 6 al 9 sin una apertura o sesión que la documente.',
  locations: ['src/utils/eventSchedule.ts:267'],
});

console.log(JSON.stringify({
  reviewDate: '2026-09-07',
  meaning: 'Cinco defectos reproducidos. Las aserciones verifican los defectos observados; no son tests de aceptación.',
  productWrites: false,
  realDatasetCases: ['T1'], syntheticCases: ['T2', 'T3', 'T4', 'T5'],
  findings,
  result: '5/5 reproducciones confirmadas',
}, null, 2));

import { describe, expect, it } from 'vitest';
import { evaluateRefresh } from '../../automation/lib/refresh-guard.mjs';

const NOW = Date.parse('2026-09-27T04:17:00Z');
const okReport = { published: true, collectComplete: true, steps: { publish: 'ok' } };

function events(count: number, expiresAt = '2026-10-10T00:00:00+02:00', status = 'published') {
  return Array.from({ length: count }, (_, i) => ({ id: `e${i}`, status, expiresAt }));
}

describe('evaluateRefresh', () => {
  it('acepta un conjunto similar (solo cambia la marca de consulta)', () => {
    const result = evaluateRefresh({ previous: events(50), next: events(48), report: okReport, nowMs: NOW });
    expect(result.ok).toBe(true);
  });

  it('bloquea cero eventos', () => {
    const result = evaluateRefresh({ previous: events(50), next: [], report: okReport, nowMs: NOW });
    expect(result.ok).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/0/);
  });

  it('bloquea una caída de más del 60 % de próximos', () => {
    const result = evaluateRefresh({ previous: events(50), next: events(19), report: okReport, nowMs: NOW });
    expect(result.ok).toBe(false);
    expect(result.reasons[0]).toMatch(/Caída sospechosa/);
  });

  it('acepta una caída del 60 % exacto', () => {
    const result = evaluateRefresh({ previous: events(50), next: events(20), report: okReport, nowMs: NOW });
    expect(result.ok).toBe(true);
  });

  it('no cuenta como pérdida lo que ya caducó en el conjunto anterior', () => {
    const previous = [...events(40, '2026-09-20T00:00:00+02:00'), ...events(10)];
    const result = evaluateRefresh({ previous, next: events(9), report: okReport, nowMs: NOW });
    expect(result.previousUpcoming).toBe(10);
    expect(result.ok).toBe(true);
  });

  it('con pocos previos no aplica el porcentaje, pero sí exige al menos uno', () => {
    expect(evaluateRefresh({ previous: events(5), next: events(1), report: okReport, nowMs: NOW }).ok).toBe(true);
    expect(evaluateRefresh({ previous: [], next: events(3), report: okReport, nowMs: NOW }).ok).toBe(true);
  });

  it('bloquea si events:build no publicó o la recolección fue incompleta', () => {
    const notPublished = { published: false, collectComplete: true, steps: { publish: 'empty-guard' } };
    expect(evaluateRefresh({ previous: events(50), next: events(50), report: notPublished, nowMs: NOW }).ok).toBe(false);
    const incomplete = { published: true, collectComplete: false };
    expect(evaluateRefresh({ previous: events(50), next: events(50), report: incomplete, nowMs: NOW }).ok).toBe(false);
  });
});

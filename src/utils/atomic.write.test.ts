import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('atomic write contract', () => {
  it('escribe vía temporal y rename', () => {
    const dir = join(tmpdir(), `retiro-atomic-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const target = join(dir, 'events.json');
    const tmp = `${target}.tmp`;
    writeFileSync(tmp, '[{"id":"1"}]');
    renameSync(tmp, target);
    expect(existsSync(tmp)).toBe(false);
    expect(JSON.parse(readFileSync(target, 'utf8'))).toEqual([{ id: '1' }]);
    rmSync(dir, { recursive: true, force: true });
  });
});

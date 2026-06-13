// SPDX-License-Identifier: MIT
//
// Smoke test for examples/federation/federation.mjs.
//
// Mirrors the iter-32 quickstart pattern: the example is CODE that must
// keep running, not docs that nobody verifies.

import { describe, it, expect } from 'vitest';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const execFile = promisify(execFileCb);

const ROOT = process.cwd();
const SCRIPT = join(ROOT, 'examples', 'federation', 'federation.mjs');

async function runFed(args: string[] = []): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const r = await execFile('node', [SCRIPT, ...args], {
      cwd: ROOT,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return { code: 0, stdout: r.stdout, stderr: r.stderr };
  } catch (e) {
    const err = e as { code?: number; stdout?: string; stderr?: string };
    return { code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

describe('examples/federation/federation.mjs', () => {
  it('the script + README exist', () => {
    expect(existsSync(SCRIPT)).toBe(true);
    expect(existsSync(join(ROOT, 'examples', 'federation', 'README.md'))).toBe(true);
  });

  it('runs the 7-step bidirectional handshake and exits 0', async () => {
    const r = await runFed();
    expect(r.code, `stderr:\n${r.stderr}`).toBe(0);
    // Pin the 7 step markers (regression check on the demo's structure)
    for (let i = 1; i <= 7; i++) {
      expect(r.stderr, `missing step ${i}`).toMatch(new RegExp(`\\[step ${i}\\]`));
    }
    expect(r.stderr).toMatch(/DONE in/);
  }, 30_000);

  it('reports asymmetric demotion (A removes B, B retains A)', async () => {
    const r = await runFed();
    expect(r.stderr).toMatch(/A now has 0 peer\(s\)/);
    expect(r.stderr).toMatch(/B still has 1 peer\(s\)/);
  }, 30_000);
});

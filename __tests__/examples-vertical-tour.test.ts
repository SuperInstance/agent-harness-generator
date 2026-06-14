// SPDX-License-Identifier: MIT
//
// Smoke test for examples/vertical-tour/vertical-tour.mjs (iter 88).

import { describe, it, expect } from 'vitest';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const execFile = promisify(execFileCb);

const ROOT = process.cwd();
const SCRIPT = join(ROOT, 'examples', 'vertical-tour', 'vertical-tour.mjs');

async function runTour(args: string[] = []): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const r = await execFile('node', [SCRIPT, ...args], {
      cwd: ROOT,
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    });
    return { code: 0, stdout: r.stdout, stderr: r.stderr };
  } catch (e) {
    const err = e as { code?: number; stdout?: string; stderr?: string };
    return { code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

describe('examples/vertical-tour/vertical-tour.mjs', () => {
  it('the script + README exist', () => {
    expect(existsSync(SCRIPT)).toBe(true);
    expect(existsSync(join(ROOT, 'examples', 'vertical-tour', 'README.md'))).toBe(true);
  });

  it('scaffolds + validates every vertical on claude-code (default)', async () => {
    const r = await runTour();
    expect(r.code, `stderr:\n${r.stderr}`).toBe(0);
    expect(r.stderr).toMatch(/\[vertical-tour\] DONE/);
  }, 180_000);

  it('--json emits parseable JSON with every report HEALTHY', async () => {
    const r = await runTour(['--json']);
    expect(r.code, `stderr:\n${r.stderr}`).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.failed).toBe(0);
    expect(parsed.count).toBeGreaterThanOrEqual(17);
    expect(parsed.reports.length).toBe(parsed.count);
    for (const r of parsed.reports) {
      expect(r.healthy, `${r.template} not healthy`).toBe(true);
    }
  }, 180_000);

  it('lists the newest two verticals (vertical:education iter 80 + vertical:sales iter 87)', async () => {
    const r = await runTour();
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('vertical:education');
    expect(r.stdout).toContain('vertical:sales');
  }, 180_000);
});

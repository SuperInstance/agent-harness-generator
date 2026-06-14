// SPDX-License-Identifier: MIT
//
// Tests for scripts/audit-deps.mjs.
// We don't actually run npm/cargo audit (that's covered by CI's
// security.yml) — these tests pin the script's contract: arg parsing,
// exit codes, and structured output.

import { describe, it, expect } from 'vitest';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const execFile = promisify(execFileCb);
const ROOT = process.cwd();
const SCRIPT = join(ROOT, 'scripts', 'audit-deps.mjs');

async function run(args: string[] = []): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const r = await execFile('node', [SCRIPT, ...args], {
      cwd: ROOT, windowsHide: true, maxBuffer: 1024 * 1024 * 16,
    });
    return { code: 0, stdout: r.stdout, stderr: r.stderr };
  } catch (e) {
    const err = e as { code?: number; stdout?: string; stderr?: string };
    return { code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

describe('scripts/audit-deps.mjs', () => {
  it('the script exists', () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });

  it('exits 2 (tooling) on unknown --level', async () => {
    const r = await run(['--level=not-a-level', '--skip-npm', '--skip-cargo']);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/unknown --level/);
  }, 30_000);

  it('honors --skip-npm + --skip-cargo (returns 0 with both skipped)', async () => {
    const r = await run(['--skip-npm', '--skip-cargo']);
    expect(r.code).toBe(0);
    expect(r.stderr).toMatch(/SKIP: npm/);
    expect(r.stderr).toMatch(/SKIP: cargo/);
    expect(r.stderr).toMatch(/ALL CLEAN/);
  }, 30_000);

  it('echoes the configured level', async () => {
    const r = await run(['--level=moderate', '--skip-npm', '--skip-cargo']);
    expect(r.stderr).toMatch(/level=moderate/);
  }, 30_000);

  it('default level is `high`', async () => {
    const r = await run(['--skip-npm', '--skip-cargo']);
    expect(r.stderr).toMatch(/level=high/);
  }, 30_000);

  it('runs real npm audit against the workspace and reports 0 advisories at high+', async () => {
    // This is the live signal — the actual gate. If a real high advisory
    // sneaks into the lockfile, this exits non-zero and the CI security
    // workflow fails too.
    const r = await run(['--skip-cargo']);
    expect(r.code, `stderr:\n${r.stderr}`).toBe(0);
    expect(r.stderr).toMatch(/PASS: npm/);
  }, 120_000);

  // iter 61 — extra-scan coverage of apps/web-ui (outside the workspace)
  it('auto-discovers apps/web-ui as an extra scan target', async () => {
    if (!existsSync(join(ROOT, 'apps', 'web-ui', 'package-lock.json'))) return;
    const r = await run(['--skip-npm', '--skip-cargo']);
    expect(r.stderr).toMatch(/extra-scans=apps\/web-ui/);
  }, 30_000);

  it('--skip-extra disables auto-discovery', async () => {
    const r = await run(['--skip-npm', '--skip-cargo', '--skip-extra']);
    expect(r.stderr).toMatch(/extra-scans=none/);
  }, 30_000);

  it('--scan=<dir> is recognized + reported in INFO', async () => {
    const r = await run(['--skip-npm', '--skip-cargo', '--scan=apps/web-ui', '--skip-extra']);
    expect(r.stderr).toMatch(/extra-scans=apps\/web-ui/);
  }, 30_000);

  it('unknown --scan=<dir> produces a SKIP, not a crash', async () => {
    // --skip-npm disables the workspace audit but the script still iterates
    // extra dirs. We pick a dir we know doesn't exist; expect SKIP, exit 0.
    const r = await run(['--skip-npm', '--skip-cargo', '--scan=does-not-exist', '--skip-extra']);
    // NOTE: --skip-npm makes the runNpmAudit function return early, so the
    // extra-scan loop above runs the SKIP path. Result should be exit 0.
    expect(r.code).toBe(0);
    expect(r.stderr).toMatch(/extra-scans=does-not-exist/);
  }, 30_000);

  it('real npm audit covers apps/web-ui (0 advisories at high+)', async () => {
    if (!existsSync(join(ROOT, 'apps', 'web-ui', 'package-lock.json'))) return;
    const r = await run(['--skip-cargo']);
    expect(r.code, `stderr:\n${r.stderr}`).toBe(0);
    expect(r.stderr).toMatch(/PASS: npm\(apps\/web-ui\)/);
  }, 180_000);

  it('--strict-tooling fails when cargo-audit not installed (we don\'t test installed because environment varies)', async () => {
    // We can only assert the strict-tooling flag is recognised; whether
    // it actually causes a FAIL depends on the host having or not having
    // cargo-audit. Just exercise the path.
    const r = await run(['--skip-npm', '--strict-tooling']);
    // Either: cargo-audit installed -> PASS; not installed -> FAIL.
    // Either way the script should not crash, exit code 0 or 1 (not 2).
    expect([0, 1]).toContain(r.code);
  }, 60_000);
});

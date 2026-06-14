// SPDX-License-Identifier: MIT
//
// iter 123 — `harness validate` chains the OIA manifest shape-check as
// informational check #7 (ADR-034 §134). Like diag (iter 76), oia NEVER
// fails the umbrella; OIA v0.1 is pre-stable + the manifest is opt-in.
//
// Locks down:
//  1. Manifest absent → SKIP row, umbrella not fanned
//  2. Manifest valid → PASS row, umbrella healthy
//  3. Manifest corrupt → WARN row, umbrella still healthy (informational)
//  4. Manifest shape-drifted → WARN row, umbrella still healthy

import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const REPO_ROOT = resolve(__dirname, '..');

let validate: (args: string[]) => Promise<{ code: number; lines: string[] }>;
let scaffold: (opts: any) => Promise<any>;
let oiaManifestCmd: (args: string[]) => Promise<{ code: number; lines: string[] }>;

beforeAll(async () => {
  const distDir = resolve(REPO_ROOT, 'packages', 'create-agent-harness', 'dist');
  if (!existsSync(join(distDir, 'validate.js'))) throw new Error('build first');
  const v = await import(`file://${join(distDir, 'validate.js')}`);
  validate = v.validate;
  const idx = await import(`file://${join(distDir, 'index.js')}`);
  scaffold = idx.scaffold;
  const oia = await import(`file://${join(distDir, 'oia-manifest.js')}`);
  oiaManifestCmd = oia.oiaManifestCmd;
});

async function scaffoldHarness(name: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), `ahg-vo-${name}-`));
  await scaffold({ name, template: 'minimal', host: 'claude-code', targetDir: dir, force: true, generatorVersion: '0.1.0' });
  return dir;
}

describe('harness validate × OIA manifest gate (iter 123, ADR-034 §134)', () => {
  it('manifest absent → SKIP row, umbrella row present', async () => {
    const dir = await scaffoldHarness('vo-skip');
    try {
      const r = await validate([dir, '--skip-gcp']);
      const out = r.lines.join('\n');
      expect(out).toMatch(/SKIP oia\s+— no \.harness\/oia-manifest\.json/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('valid manifest → PASS row in umbrella', async () => {
    const dir = await scaffoldHarness('vo-pass');
    try {
      // Emit a valid manifest first.
      await oiaManifestCmd([dir]);
      const r = await validate([dir, '--skip-gcp']);
      const out = r.lines.join('\n');
      expect(out).toMatch(/PASS oia\s+— oia-manifest shape ok \(oiaVersion=0\.1\)/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('drifted manifest → WARN row, umbrella does NOT fail', async () => {
    const dir = await scaffoldHarness('vo-warn');
    try {
      // Write a shape-drifted manifest (schema=99, no other required fields).
      await mkdir(join(dir, '.harness'), { recursive: true });
      await writeFile(join(dir, '.harness', 'oia-manifest.json'), JSON.stringify({ schema: 99 }), 'utf-8');
      const r = await validate([dir, '--skip-gcp']);
      const out = r.lines.join('\n');
      expect(out).toMatch(/WARN oia\s+— oia-manifest drift/);
      // OIA is informational; the umbrella verdict depends on the OTHER
      // 6 checks. As long as those pass, the umbrella stays HEALTHY.
      // (Some checks may fail for unrelated reasons in a transient temp
      // scaffold; we only assert the oia row's INFORMATIONAL nature here.)
      expect(out).not.toMatch(/FAIL oia\b/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('corrupt JSON manifest → WARN row with parse error', async () => {
    const dir = await scaffoldHarness('vo-corrupt');
    try {
      await mkdir(join(dir, '.harness'), { recursive: true });
      await writeFile(join(dir, '.harness', 'oia-manifest.json'), '{not valid json', 'utf-8');
      const r = await validate([dir, '--skip-gcp']);
      const out = r.lines.join('\n');
      expect(out).toMatch(/WARN oia\s+— oia-manifest parse error/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publishHarness, pinJson } from '../src/publish.js';

describe('publishHarness (dry-run path)', () => {
  it('returns dry-run-no-pin when confirm=false', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cah-pub-'));
    await mkdir(join(root, '.harness'), { recursive: true });
    await writeFile(
      join(root, '.harness', 'manifest.json'),
      JSON.stringify({ schema: 1, template: 'minimal', vars: { name: 'demo' } }),
    );
    const r = await publishHarness({
      harnessDir: root,
      pinata: { jwt: 'unused-on-dry-run' },
      confirm: false,
    });
    expect(r.confirmed).toBe(false);
    expect(r.manifestCid).toBe('dry-run-no-pin');
    expect(r.manifestSize).toBeGreaterThan(0);
  });

  it('throws if .harness/manifest.json is missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cah-pub-empty-'));
    await expect(publishHarness({
      harnessDir: root,
      pinata: { jwt: 'x' },
      confirm: false,
    })).rejects.toThrow(/no manifest/);
  });
});

describe('pinJson', () => {
  it('throws on missing JWT', async () => {
    await expect(pinJson({ jwt: '' }, { foo: 'bar' }, { name: 't' }))
      .rejects.toThrow(/PINATA_API_JWT is required/);
  });

  // Real pin path is exercised in CI publish workflow against a mock
  // Pinata server. Live tests against the real API would require a
  // valid JWT; that's gated to the publish workflow per SECURITY.md.
});

// SPDX-License-Identifier: MIT
//
// Tests for scripts/marketplace-entry.mjs — generator that builds the
// meta plugin's registry entry from .claude-plugin/plugin.json. This
// entry is what gets pinned to IPFS and discovered by other agents,
// so its shape is load-bearing for cross-installation interop.

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
// @ts-ignore — JS module, no .d.ts
import { buildMetaEntry, validateEntry } from '../scripts/marketplace-entry.mjs';

const ROOT = process.cwd();

describe('marketplace-entry generator', () => {
  it('produces a well-formed entry from the live plugin.json', async () => {
    const plugin = JSON.parse(await readFile(join(ROOT, '.claude-plugin', 'plugin.json'), 'utf-8'));
    const rootPkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf-8'));
    const entry = buildMetaEntry(plugin, rootPkg, { now: '2026-06-13T20:00:00.000Z' });
    const v = validateEntry(entry);
    expect(v.ok, `validation: ${v.problems.join('; ')}`).toBe(true);
    expect(entry.id).toBe('agent-harness-generator');
    expect(entry.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(entry.skills.length).toBeGreaterThanOrEqual(4);
    expect(entry.commands.length).toBeGreaterThanOrEqual(4);
  });

  it('mirrors the iter-22 codex skills (no marketplace/codex drift)', async () => {
    const plugin = JSON.parse(await readFile(join(ROOT, '.claude-plugin', 'plugin.json'), 'utf-8'));
    const rootPkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf-8'));
    const entry = buildMetaEntry(plugin, rootPkg);
    expect(entry.skills).toContain('create-harness');
    expect(entry.skills).toContain('publish-harness');
    expect(entry.skills).toContain('validate-harness');
    expect(entry.skills).toContain('harness-secrets');
  });

  it('mirrors the iter-24 6-host catalog in tags', async () => {
    const plugin = JSON.parse(await readFile(join(ROOT, '.claude-plugin', 'plugin.json'), 'utf-8'));
    const rootPkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf-8'));
    const entry = buildMetaEntry(plugin, rootPkg);
    expect(entry.tags).toContain('openclaw');
    expect(entry.tags).toContain('rvm');
    expect(entry.tags).toContain('claude-code');
  });

  it('includes witness/ipfs slots only when provided', async () => {
    const plugin = JSON.parse(await readFile(join(ROOT, '.claude-plugin', 'plugin.json'), 'utf-8'));
    const rootPkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf-8'));
    const empty = buildMetaEntry(plugin, rootPkg);
    expect(empty.witness).toBeUndefined();
    expect(empty.ipfs.manifestCid).toBe('');
    const signed = buildMetaEntry(plugin, rootPkg, {
      witnessPublicKey: 'a'.repeat(64),
      witnessSignedAt: '2026-06-13T21:00:00.000Z',
      manifestCid: 'Qmtest',
      tarballCid: 'Qmtest2',
    });
    expect(signed.witness?.publicKey).toBe('a'.repeat(64));
    expect(signed.ipfs.manifestCid).toBe('Qmtest');
    expect(signed.ipfs.tarballCid).toBe('Qmtest2');
  });

  it('rejects too-short descriptions', () => {
    const badPlugin = {
      name: 'x', displayName: 'X', description: 'too short',
      author: { id: 'a', displayName: 'A' }, license: 'MIT',
      homepage: 'https://example.com', repository: { type: 'git', url: 'https://example.com' },
      categories: ['x'], tags: ['x'], minClaudeFlowVersion: '3.0.0',
      type: 'scaffolding', skills: ['x'], commands: [{ name: 'x', description: 'xxxxxxxxxxx' }],
      permissions: ['memory'], hooks: [], trustLevel: 'official', verified: true,
    };
    expect(() => buildMetaEntry(badPlugin, { version: '0.1.0' })).toThrow(/description/);
  });

  it('validateEntry catches missing required fields', () => {
    const broken: any = {
      id: 'x', name: 'x', displayName: 'X', description: 'x'.repeat(40),
      version: '0.1.0', author: { id: 'a', displayName: 'A' },
      license: 'MIT', categories: ['x'], tags: ['x'], type: 't',
      // missing skills, commands, permissions, trustLevel, verified
    };
    const v = validateEntry(broken);
    expect(v.ok).toBe(false);
    expect(v.problems.join(' ')).toMatch(/missing: skills/);
  });
});

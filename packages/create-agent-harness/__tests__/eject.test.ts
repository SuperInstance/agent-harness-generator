// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planEject, applyEject, rewriteContent } from '../src/eject.js';

describe('rewriteContent', () => {
  it('rewrites bare ruflo / claude-flow references', () => {
    expect(rewriteContent('ruflo is great', 'my-bot')).toBe('my-bot is great');
    expect(rewriteContent('claude-flow rocks', 'my-bot')).toBe('my-bot rocks');
  });

  it('rewrites @claude-flow/cli inside scoped names', () => {
    expect(rewriteContent('@claude-flow/cli', 'my-bot')).toBe('my-bot');
  });

  it('leaves prose mentions inside code blocks alone — well, no, it rewrites those too (intentional)', () => {
    // We DO rewrite code-block content; the harness needs to point at its
    // own npm package, not ruflo's.
    expect(rewriteContent('`npx ruflo init`', 'my-bot')).toBe('`npx my-bot init`');
  });

  it('preserves attribution blocks marked with HTML comments', () => {
    const md = `# Hello\n<!-- ruflo-attribution-block -->\nPowered by ruflo and claude-flow\n<!-- /ruflo-attribution-block -->\nbut ruflo is now my-bot here.`;
    const out = rewriteContent(md, 'my-bot');
    expect(out).toContain('Powered by ruflo and claude-flow');
    expect(out).toContain('but my-bot is now my-bot here.');
  });

  it('does not match partial words', () => {
    expect(rewriteContent('ruflocopter', 'my-bot')).toBe('ruflocopter');
    expect(rewriteContent('claude-flowing', 'my-bot')).toBe('claude-flowing');
  });
});

async function setupRuflo() {
  const root = await mkdtemp(join(tmpdir(), 'cah-eject-'));
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.claude-flow'), { recursive: true });
  await mkdir(join(root, 'agents'), { recursive: true });
  await mkdir(join(root, 'node_modules', 'pkg'), { recursive: true });
  await writeFile(join(root, 'CLAUDE.md'), '# ruflo project\nUses claude-flow.\n');
  await writeFile(join(root, '.mcp.json'), JSON.stringify({ mcpServers: { 'claude-flow': { command: 'npx', args: ['claude-flow'] } } }));
  await writeFile(join(root, 'agents', 'coder.md'), '---\nname: coder\n---\n# Coder agent\nClaude-flow agent.');
  await writeFile(join(root, '.claude-flow', 'memory.db'), 'should be skipped');
  await writeFile(join(root, 'node_modules', 'pkg', 'index.js'), 'noop');
  return root;
}

describe('planEject', () => {
  it('lists agents/, CLAUDE.md, .mcp.json — skips .claude-flow/ and node_modules/', async () => {
    const root = await setupRuflo();
    const plan = await planEject(root, 'my-bot');
    expect(plan.newName).toBe('my-bot');
    expect(plan.files).toContain('CLAUDE.md');
    expect(plan.files).toContain('.mcp.json');
    expect(plan.files).toContain('agents/coder.md');
    expect(plan.files.find(f => f.startsWith('.claude-flow/'))).toBeUndefined();
    expect(plan.files.find(f => f.startsWith('node_modules/'))).toBeUndefined();
    expect(plan.skipped.map(s => s.path)).toContain('.claude-flow/');
    expect(plan.skipped.map(s => s.path)).toContain('node_modules/');
  });

  it('throws for a non-existent source', async () => {
    await expect(planEject('/no/such/path/12345xyz', 'x')).rejects.toThrow(/source does not exist/);
  });
});

describe('applyEject', () => {
  it('writes rewritten files into the target', async () => {
    const root = await setupRuflo();
    const plan = await planEject(root, 'my-bot');
    const target = join(root, '..', 'ejected-' + Math.random().toString(36).slice(2));
    const r = await applyEject(plan, target, '0.1.0');

    expect(r.written).toContain('CLAUDE.md');
    expect(r.written).toContain('agents/coder.md');
    expect(r.written).toContain('.harness/manifest.json');

    const claudeMd = await readFile(join(target, 'CLAUDE.md'), 'utf-8');
    expect(claudeMd).toContain('# my-bot project');
    expect(claudeMd).toContain('Uses my-bot.');

    const mcp = JSON.parse(await readFile(join(target, '.mcp.json'), 'utf-8'));
    expect(mcp.mcpServers['my-bot']).toBeDefined();
    expect(mcp.mcpServers['claude-flow']).toBeUndefined();

    const manifest = JSON.parse(await readFile(join(target, '.harness', 'manifest.json'), 'utf-8'));
    expect(manifest.template).toBe('eject-from-ruflo');
    expect(manifest.ejected_from).toBe(root);
    expect(manifest.skipped_on_eject.length).toBeGreaterThanOrEqual(1);
  });

  it('refuses to overwrite an existing target', async () => {
    const root = await setupRuflo();
    const plan = await planEject(root, 'my-bot');
    const target = join(root, '..', 'ejected-existing-' + Math.random().toString(36).slice(2));
    await mkdir(target, { recursive: true });
    await expect(applyEject(plan, target, '0.1.0')).rejects.toThrow(/target exists/);
  });
});

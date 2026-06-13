// SPDX-License-Identifier: MIT
//
// Schema-level validation of .claude-plugin/plugin.json against the
// fields the Claude Code marketplace registry consumes (per ADR-016
// and the Claude Code plugin docs).
//
// This is the surface OTHER agents discover this plugin through.
// Drift here breaks installs silently, so we lock the shape in tests.

import { describe, it, expect } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PLUGIN_PATH = join(process.cwd(), '.claude-plugin', 'plugin.json');
const CODEX_SKILLS_DIR = join(process.cwd(), '.codex', 'skills');

let plugin: any;

describe('claude marketplace plugin.json', () => {
  it('the file exists', () => {
    expect(existsSync(PLUGIN_PATH)).toBe(true);
  });

  it('is valid JSON', async () => {
    plugin = JSON.parse(await readFile(PLUGIN_PATH, 'utf-8'));
    expect(plugin).toBeTypeOf('object');
  });

  it('has every field the Claude Code marketplace registry requires', async () => {
    plugin = JSON.parse(await readFile(PLUGIN_PATH, 'utf-8'));
    // Per Claude marketplace registry schema (.claude-plugin/plugin.json)
    expect(plugin.name).toBeTypeOf('string');
    expect(plugin.name).toMatch(/^[a-z0-9-]+$/);
    expect(plugin.displayName).toBeTypeOf('string');
    expect(plugin.description).toBeTypeOf('string');
    expect(plugin.description.length).toBeGreaterThan(30);
    expect(plugin.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(plugin.author).toBeTypeOf('object');
    expect(plugin.author.id).toBeTypeOf('string');
    expect(plugin.author.displayName).toBeTypeOf('string');
    expect(plugin.license).toBeTypeOf('string');
    expect(plugin.homepage).toMatch(/^https:\/\//);
    expect(plugin.repository).toBeTypeOf('object');
    expect(plugin.repository.type).toBe('git');
    expect(plugin.repository.url).toMatch(/^https:\/\//);
    expect(Array.isArray(plugin.categories)).toBe(true);
    expect(plugin.categories.length).toBeGreaterThan(0);
    expect(Array.isArray(plugin.tags)).toBe(true);
    expect(plugin.tags.length).toBeGreaterThan(0);
    expect(plugin.minClaudeFlowVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(plugin.type).toBeTypeOf('string');
    expect(Array.isArray(plugin.skills)).toBe(true);
    expect(Array.isArray(plugin.commands)).toBe(true);
    expect(Array.isArray(plugin.permissions)).toBe(true);
    expect(typeof plugin.trustLevel).toBe('string');
    expect(typeof plugin.verified).toBe('boolean');
  });

  it('every command has a name + description', async () => {
    plugin = JSON.parse(await readFile(PLUGIN_PATH, 'utf-8'));
    for (const [i, cmd] of plugin.commands.entries()) {
      expect(cmd.name, `commands[${i}] missing name`).toBeTypeOf('string');
      expect(cmd.name, `commands[${i}] name not kebab-case`).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(cmd.description, `commands[${i}] missing description`).toBeTypeOf('string');
      expect(cmd.description.length, `commands[${i}] description too short`).toBeGreaterThan(10);
    }
  });

  it('every skill referenced has a backing .codex/skills/<name>/ directory', async () => {
    plugin = JSON.parse(await readFile(PLUGIN_PATH, 'utf-8'));
    const codexSkills = (await readdir(CODEX_SKILLS_DIR, { withFileTypes: true }))
      .filter(d => d.isDirectory())
      .map(d => d.name);
    for (const skill of plugin.skills) {
      expect(
        codexSkills,
        `plugin.json declares skill "${skill}" but .codex/skills/${skill}/ doesn't exist`,
      ).toContain(skill);
    }
  });

  it('every codex skill is declared in plugin.json (no orphan skills)', async () => {
    plugin = JSON.parse(await readFile(PLUGIN_PATH, 'utf-8'));
    const codexSkills = (await readdir(CODEX_SKILLS_DIR, { withFileTypes: true }))
      .filter(d => d.isDirectory())
      .map(d => d.name);
    for (const skill of codexSkills) {
      expect(
        plugin.skills,
        `.codex/skills/${skill}/ exists but plugin.json doesn't declare it`,
      ).toContain(skill);
    }
  });

  it('tags include every supported host (catches host-add drift)', async () => {
    plugin = JSON.parse(await readFile(PLUGIN_PATH, 'utf-8'));
    const hostTags = ['claude-code', 'codex', 'pi-dev', 'openclaw', 'rvm'];
    for (const t of hostTags) {
      expect(plugin.tags, `missing host tag: ${t}`).toContain(t);
    }
    // hermes-agent is the npm-flavoured tag (different convention)
    expect(plugin.tags).toContain('hermes-agent');
  });

  it('declared skills match codex skill count exactly', async () => {
    plugin = JSON.parse(await readFile(PLUGIN_PATH, 'utf-8'));
    const codexSkills = (await readdir(CODEX_SKILLS_DIR, { withFileTypes: true }))
      .filter(d => d.isDirectory())
      .map(d => d.name);
    expect(plugin.skills.length).toBe(codexSkills.length);
  });
});

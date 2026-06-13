#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Generate the marketplace-registry JSON entry for THIS project (the meta
// agent-harness-generator plugin). This is the JSON blob that gets pinned
// to IPFS via Pinata and referenced from the plugin discovery registry.
//
// Inputs:
//   .claude-plugin/plugin.json        — surface metadata
//   package.json (root)               — version + repo
//
// Output:
//   dist/marketplace-entry.json       — ready for `pinata pin file`
//
// Run with:
//   node scripts/marketplace-entry.mjs               # writes file
//   node scripts/marketplace-entry.mjs --print       # prints to stdout
//   node scripts/marketplace-entry.mjs --validate    # validates only

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const PRINT = args.includes('--print');
const VALIDATE_ONLY = args.includes('--validate');

function fail(msg) {
  process.stderr.write(`[marketplace-entry] FAIL: ${msg}\n`);
  process.exit(1);
}
function info(msg) {
  process.stderr.write(`[marketplace-entry] ${msg}\n`);
}

/**
 * Map .claude-plugin/plugin.json + root metadata into a marketplace
 * registry entry. Shape mirrors v3/@claude-flow/cli/src/plugins/store/
 * discovery.ts so the same browsing UI consumes it.
 */
export function buildMetaEntry(plugin, rootPkg, opts = {}) {
  const now = opts.now ?? new Date().toISOString();
  const id = plugin.name;
  const description = plugin.description;
  if (!description || description.length < 30) {
    throw new Error('plugin.description must be >=30 chars for marketplace');
  }
  const entry = {
    id,
    name: plugin.name,
    displayName: plugin.displayName,
    description,
    version: rootPkg.version,
    size: opts.size ?? 0,
    checksum: opts.checksum ?? `sha256:${createHash('sha256').update(JSON.stringify(plugin)).digest('hex')}`,
    author: {
      id: plugin.author.id,
      displayName: plugin.author.displayName,
      verified: plugin.verified === true,
    },
    license: plugin.license,
    homepage: plugin.homepage,
    repository: plugin.repository,
    categories: plugin.categories,
    tags: plugin.tags,
    minClaudeFlowVersion: plugin.minClaudeFlowVersion,
    type: plugin.type,
    skills: plugin.skills,
    commands: plugin.commands,
    permissions: plugin.permissions,
    hooks: plugin.hooks ?? [],
    trustLevel: plugin.trustLevel,
    verified: plugin.verified,
    downloads: opts.downloads ?? 0,
    rating: opts.rating ?? 5,
    lastUpdated: now,
    // Witness-signed releases — present when a release tag has been built.
    // ABSENT when generated pre-publish; CI fills these in.
    ...(opts.witnessPublicKey ? {
      witness: {
        publicKey: opts.witnessPublicKey,
        signedAt: opts.witnessSignedAt ?? now,
      },
    } : {}),
    // IPFS CIDs for the artefacts the entry references. Filled by the
    // publish pipeline; left empty pre-pin.
    ipfs: {
      manifestCid: opts.manifestCid ?? '',
      tarballCid: opts.tarballCid ?? '',
    },
  };
  return entry;
}

/** Validate the produced entry has the minimum fields the registry needs. */
export function validateEntry(entry) {
  const required = [
    'id', 'name', 'displayName', 'description', 'version', 'author',
    'license', 'categories', 'tags', 'type', 'skills', 'commands',
    'permissions', 'trustLevel', 'verified',
  ];
  const missing = required.filter(k => entry[k] === undefined || entry[k] === null);
  if (missing.length) return { ok: false, problems: [`missing: ${missing.join(', ')}`] };
  const problems = [];
  if (!/^\d+\.\d+\.\d+/.test(entry.version)) problems.push(`bad version: ${entry.version}`);
  if (!Array.isArray(entry.skills) || entry.skills.length === 0) problems.push('empty skills');
  if (!Array.isArray(entry.commands) || entry.commands.length === 0) problems.push('empty commands');
  if (entry.description.length < 30) problems.push('description too short');
  return { ok: problems.length === 0, problems };
}

async function main() {
  const plugin = JSON.parse(await readFile(join(ROOT, '.claude-plugin', 'plugin.json'), 'utf-8'));
  const rootPkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf-8'));
  const entry = buildMetaEntry(plugin, rootPkg);
  const v = validateEntry(entry);
  if (!v.ok) {
    fail(`registry entry invalid: ${v.problems.join('; ')}`);
  }
  info(`built entry for ${entry.id}@${entry.version} (${entry.skills.length} skills, ${entry.commands.length} commands)`);

  if (VALIDATE_ONLY) {
    info('VALIDATE_ONLY — nothing written');
    return;
  }
  if (PRINT) {
    process.stdout.write(JSON.stringify(entry, null, 2) + '\n');
    return;
  }
  const distDir = join(ROOT, 'dist');
  await mkdir(distDir, { recursive: true });
  const out = join(distDir, 'marketplace-entry.json');
  await writeFile(out, JSON.stringify(entry, null, 2) + '\n', 'utf-8');
  info(`wrote ${out}`);
}

main().catch(err => fail(err?.message ?? err));

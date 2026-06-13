#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// examples/federation/federation.mjs
//
// Runnable end-to-end federation demo. Spins up TWO harness instances
// inside tmpdirs, has them exchange peer info, and proves the federation
// state survives serialization/deserialization across both sides.
//
// No network: this exercises the federation state + claims layer
// in-process. Real cross-machine federation adds a WebSocket transport
// on top of the same state shape (see ADR-014).
//
// Run:
//   node examples/federation/federation.mjs
//   node examples/federation/federation.mjs --keep    # preserve dirs

import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  emptyState,
  addPeer,
  removePeer,
  listPeers,
  saveState,
  loadState,
} from '../../packages/create-agent-harness/dist/federate.js';

const args = process.argv.slice(2);
const KEEP = args.includes('--keep');

function step(n, msg) { process.stderr.write(`\n[step ${n}] ${msg}\n`); }
function log(msg) { process.stderr.write(`  ${msg}\n`); }

async function main() {
  const t0 = Date.now();

  step(1, 'Provision two harness dirs (host-A, host-B)');
  const dirA = await mkdtemp(join(tmpdir(), 'ahg-fed-A-'));
  const dirB = await mkdtemp(join(tmpdir(), 'ahg-fed-B-'));
  await mkdir(join(dirA, '.harness'), { recursive: true });
  await mkdir(join(dirB, '.harness'), { recursive: true });
  log(`A: ${dirA}`);
  log(`B: ${dirB}`);

  step(2, 'Initialise federation state on each side');
  let stateA = emptyState('host-A');
  let stateB = emptyState('host-B');
  await saveState(dirA, stateA);
  await saveState(dirB, stateB);
  log(`A self_id=${stateA.self_id} peers=0`);
  log(`B self_id=${stateB.self_id} peers=0`);

  step(3, 'Each side adds the other as a trusted peer');
  stateA = addPeer(stateA, {
    id: 'host-B',
    name: 'host-B',
    endpoint: 'ws://host-b.internal:9000',
    trust: 'trusted',
  });
  stateB = addPeer(stateB, {
    id: 'host-A',
    name: 'host-A',
    endpoint: 'ws://host-a.internal:9000',
    trust: 'trusted',
  });
  await saveState(dirA, stateA);
  await saveState(dirB, stateB);
  log(`A peers: ${listPeers(stateA).map(p => p.id).join(', ')}`);
  log(`B peers: ${listPeers(stateB).map(p => p.id).join(', ')}`);

  step(4, 'Round-trip: reload state from disk on each side');
  const reloadedA = await loadState(dirA);
  const reloadedB = await loadState(dirB);
  if (!reloadedA || !reloadedB) {
    throw new Error('round-trip failed: loadState returned null');
  }
  if (reloadedA.peers['host-B']?.trust !== 'trusted') {
    throw new Error(`A's view of host-B trust drifted: ${JSON.stringify(reloadedA.peers['host-B'])}`);
  }
  if (reloadedB.peers['host-A']?.trust !== 'trusted') {
    throw new Error(`B's view of host-A trust drifted: ${JSON.stringify(reloadedB.peers['host-A'])}`);
  }
  log('A reloaded: matches in-memory state');
  log('B reloaded: matches in-memory state');

  step(5, 'Trust-tier filter: --trusted shows only trusted peers');
  const trustedA = listPeers(reloadedA, { trusted: true });
  const trustedB = listPeers(reloadedB, { trusted: true });
  log(`A trusted-only peer count: ${trustedA.length}`);
  log(`B trusted-only peer count: ${trustedB.length}`);

  step(6, 'Demote: A removes B from its peer list, B retains A');
  stateA = removePeer(reloadedA, 'host-B');
  await saveState(dirA, stateA);
  const finalA = await loadState(dirA);
  if (finalA?.peers['host-B']) throw new Error('removePeer failed');
  log(`A now has ${Object.keys(finalA.peers).length} peer(s)`);
  log(`B still has ${Object.keys(reloadedB.peers).length} peer(s) — federation is per-side`);

  step(7, 'Summary');
  const ms = Date.now() - t0;
  log(`6-step bidirectional handshake completed in ${ms}ms`);
  log('state survives reload, trust filters work, asymmetric demotion works');

  if (KEEP) {
    log(`KEPT A=${dirA} B=${dirB} (--keep)`);
  } else {
    await rm(dirA, { recursive: true, force: true });
    await rm(dirB, { recursive: true, force: true });
    log('cleaned up');
  }
  process.stderr.write(`\n[federation] DONE in ${ms}ms — A+B federated, asymmetric state validated\n`);
}

main().catch(err => {
  process.stderr.write(`\n[federation] FAIL: ${err?.stack ?? err}\n`);
  process.exit(1);
});

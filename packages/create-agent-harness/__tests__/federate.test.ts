// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  emptyState,
  addPeer,
  removePeer,
  listPeers,
  saveState,
  loadState,
  federateDispatch,
} from '../src/federate.js';

describe('federation state', () => {
  it('emptyState seeds self_id + empty peers', () => {
    const s = emptyState('peer-self');
    expect(s.self_id).toBe('peer-self');
    expect(s.peers).toEqual({});
    expect(s.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('addPeer inserts + immutably', () => {
    const s = emptyState('self');
    const s2 = addPeer(s, { id: 'p1', name: 'one', endpoint: 'ws://x', trust: 'trusted' });
    expect(Object.keys(s.peers)).toEqual([]);
    expect(Object.keys(s2.peers)).toEqual(['p1']);
    expect(s2.peers.p1.trust).toBe('trusted');
  });

  it('addPeer rejects empty id/name', () => {
    const s = emptyState('self');
    expect(() => addPeer(s, { id: '', name: 'x', endpoint: 'y', trust: 'untrusted' })).toThrow();
    expect(() => addPeer(s, { id: 'x', name: '', endpoint: 'y', trust: 'untrusted' })).toThrow();
  });

  it('removePeer drops + no-ops on missing', () => {
    let s = emptyState('self');
    s = addPeer(s, { id: 'p1', name: 'a', endpoint: 'x', trust: 'untrusted' });
    const s2 = removePeer(s, 'p1');
    expect(s2.peers).toEqual({});
    const s3 = removePeer(s2, 'p1');
    expect(s3).toBe(s2); // no-op short-circuits
  });

  it('listPeers --trusted filters out untrusted', () => {
    let s = emptyState('self');
    s = addPeer(s, { id: 'a', name: 'a', endpoint: 'x', trust: 'trusted' });
    s = addPeer(s, { id: 'b', name: 'b', endpoint: 'y', trust: 'untrusted' });
    expect(listPeers(s).length).toBe(2);
    expect(listPeers(s, { trusted: true }).length).toBe(1);
  });

  it('save + load round-trips state', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fed-roundtrip-'));
    let s = emptyState('self');
    s = addPeer(s, { id: 'p1', name: 'p1', endpoint: 'ws://x', trust: 'self' });
    await saveState(dir, s);
    const back = await loadState(dir);
    expect(back?.self_id).toBe('self');
    expect(back?.peers.p1.endpoint).toBe('ws://x');
  });

  it('loadState returns null when no state file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fed-empty-'));
    expect(await loadState(dir)).toBeNull();
  });
});

describe('federateDispatch', () => {
  it('init creates state', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fed-cli-init-'));
    const r = await federateDispatch(['init', 'self-x'], dir);
    expect(r.code).toBe(0);
    expect(r.lines.join('\n')).toMatch(/Initialized federation state/);
  });

  it('add fails without prior init', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fed-cli-noinit-'));
    const r = await federateDispatch(['add', 'p1', 'name', 'ws://x'], dir);
    expect(r.code).toBe(1);
    expect(r.lines.join('\n')).toMatch(/No federation state/);
  });

  it('full happy path: init -> add -> list -> status', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fed-cli-happy-'));
    expect((await federateDispatch(['init', 'self-y'], dir)).code).toBe(0);
    expect((await federateDispatch(['add', 'p1', 'one', 'ws://1', 'trusted'], dir)).code).toBe(0);
    const list = await federateDispatch(['list'], dir);
    expect(list.lines.join('\n')).toMatch(/p1/);
    const status = await federateDispatch(['status'], dir);
    expect(status.lines.join('\n')).toMatch(/Peers: 1/);
  });

  it('rejects unknown trust tier', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fed-cli-trust-'));
    await federateDispatch(['init', 'self'], dir);
    const r = await federateDispatch(['add', 'p1', 'n', 'ws://x', 'lol'], dir);
    expect(r.code).toBe(2);
    expect(r.lines.join('\n')).toMatch(/Unknown trust tier/);
  });

  it('help lists subactions', async () => {
    const r = await federateDispatch(['help']);
    expect(r.code).toBe(0);
    expect(r.lines.join('\n')).toMatch(/init.*self-id/);
    expect(r.lines.join('\n')).toMatch(/add.*trust/);
  });
});

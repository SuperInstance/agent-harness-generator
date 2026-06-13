// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TrajectoryStore } from '../src/trajectory.js';

describe('TrajectoryStore', () => {
  it('append + readAll round-trips', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'traj-'));
    const s = new TrajectoryStore(join(dir, 'log.jsonl'));
    await s.append({ ts: '2026-06-13T00:00:00Z', phase: 'Retrieve', outcome: 'success' });
    await s.append({ ts: '2026-06-13T00:00:01Z', phase: 'Judge', outcome: 'success', output: { judge_score: 0.8 } });
    const all = await s.readAll();
    expect(all.length).toBe(2);
    expect(all[0]!.phase).toBe('Retrieve');
    expect(all[1]!.output).toEqual({ judge_score: 0.8 });
  });

  it('readAll on missing file returns []', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'traj-'));
    const s = new TrajectoryStore(join(dir, 'never.jsonl'));
    expect(await s.readAll()).toEqual([]);
  });

  it('rotateIfLarger no-op when smaller', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'traj-'));
    const s = new TrajectoryStore(join(dir, 'log.jsonl'));
    await s.append({ ts: 't', phase: 'Retrieve', outcome: 'success' });
    expect(await s.rotateIfLarger(1_000_000)).toBe(false);
  });

  it('rotateIfLarger rotates and resets when over', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'traj-'));
    const s = new TrajectoryStore(join(dir, 'log.jsonl'));
    for (let i = 0; i < 100; i++) {
      await s.append({ ts: 't', phase: 'Retrieve', outcome: 'success', output: { i } });
    }
    expect(await s.rotateIfLarger(100)).toBe(true);
    expect(await s.size()).toBe(0);
  });
});

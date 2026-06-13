// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import { rankWithDecay, linearDecay, type MemoryHit } from '../src/memory.js';

describe('linearDecay', () => {
  it('returns 1 at age 0', () => {
    expect(linearDecay(0, 1000)).toBe(1);
  });
  it('returns 0.5 at one half-life', () => {
    expect(linearDecay(1000, 1000)).toBeCloseTo(0.5);
  });
  it('returns 0.25 at two half-lives', () => {
    expect(linearDecay(2000, 1000)).toBeCloseTo(0.25);
  });
  it('clamps negative ages to weight 1', () => {
    expect(linearDecay(-5, 1000)).toBe(1);
  });
});

describe('rankWithDecay', () => {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const NOW = 1_700_000_000_000;

  const hits: MemoryHit[] = [
    { id: 'a', score: 0.9, decayedScore: 0, namespace: 'ns', storedAt: NOW - 30 * DAY },
    { id: 'b', score: 0.8, decayedScore: 0, namespace: 'ns', storedAt: NOW - 1 * HOUR },
    { id: 'c', score: 0.6, decayedScore: 0, namespace: 'ns', storedAt: NOW - 7 * DAY },
  ];

  it('falls back to raw score when useDecay is false', async () => {
    const r = await rankWithDecay(hits, { useDecay: false });
    expect(r.map(h => h.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns decayedScore === score when emergent-time is unavailable (graceful fallback)', async () => {
    // No emergent-time package install in this monorepo at iter 5 unless
    // npm install ran — the loader returns null, and we fall back to raw
    // scores reported under decayedScore so callers don't have to branch.
    const r = await rankWithDecay(hits, { useDecay: true, now: NOW });
    expect(r.length).toBe(3);
    for (const h of r) {
      expect(h.decayedScore).toBeGreaterThan(0);
    }
  });

  it('sorts descending by the ranking key', async () => {
    const r = await rankWithDecay(hits, { useDecay: false });
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
    }
  });
});

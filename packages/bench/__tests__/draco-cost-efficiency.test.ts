// SPDX-License-Identifier: MIT
// DRACO cost-efficiency (ADR-039) — pure arithmetic, fully deterministic.

import { describe, it, expect } from 'vitest';
import { costOf, makePoint, paretoCompare, BLENDED_USD_PER_MTOK } from '../src/draco/cost-efficiency.js';

describe('costOf', () => {
  it('computes tokens × blended rate / 1M', () => {
    expect(costOf('anthropic/claude-opus-4', 1_000_000)).toBeCloseTo(45);
    expect(costOf('anthropic/claude-haiku-4.5', 40_529)).toBeCloseTo((40_529 / 1e6) * 3, 6);
  });
  it('throws on an unknown model', () => {
    expect(() => costOf('unknown/model', 100)).toThrow(/no blended price/);
  });
  it('accepts a price override', () => {
    expect(costOf('x/y', 1_000_000, { 'x/y': 10 })).toBe(10);
  });
});

describe('paretoCompare — the measured DRACO cost result', () => {
  it('cheap vanilla Pareto-DOMINATES frontier vanilla (real committed numbers)', () => {
    // From threeway-frontier-full.json and threeway-cheap-full.json (vanilla arm).
    const frontier = makePoint('frontier vanilla', 'anthropic/claude-opus-4', 0.7143, 27115);
    const cheap = makePoint('cheap vanilla', 'anthropic/claude-haiku-4.5', 0.7566, 40529);
    const v = paretoCompare(frontier, cheap);
    expect(v.dominates).toBe(true); // higher quality AND lower cost
    expect(v.qualityDelta).toBeGreaterThan(0); // cheap is BETTER quality
    expect(v.costRatio).toBeGreaterThan(5); // cheap is >5x cheaper
    expect(v.qualityPerUSDRatio).toBeGreaterThan(5); // >5x more quality per dollar
  });

  it('does not falsely claim dominance when the challenger is worse quality', () => {
    const base = makePoint('a', 'anthropic/claude-opus-4', 0.80, 1000);
    const worse = makePoint('b', 'anthropic/claude-haiku-4.5', 0.70, 1000);
    expect(paretoCompare(base, worse).dominates).toBe(false);
  });
});

describe('price table sanity', () => {
  it('opus is materially pricier than haiku (the lever)', () => {
    expect(BLENDED_USD_PER_MTOK['anthropic/claude-opus-4']).toBeGreaterThan(
      BLENDED_USD_PER_MTOK['anthropic/claude-haiku-4.5'] * 5,
    );
  });
});

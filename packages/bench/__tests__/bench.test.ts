// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import { cosine, decayWeight, rank, runEval, buildSyntheticEval } from '../src/index.js';

describe('cosine', () => {
  it('returns 1 for identical unit vectors', () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it('returns 0 on dimension mismatch (graceful)', () => {
    expect(cosine([1, 0], [1, 0, 0])).toBe(0);
  });

  it('returns 0 for zero vectors', () => {
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });
});

describe('decayWeight', () => {
  it('returns 1 at age 0', () => {
    expect(decayWeight(0, 1000)).toBe(1);
  });

  it('returns 0.5 at one half-life', () => {
    expect(decayWeight(1000, 1000)).toBeCloseTo(0.5);
  });

  it('clamps negative ages to weight 1', () => {
    expect(decayWeight(-5, 1000)).toBe(1);
  });
});

describe('rank', () => {
  const NOW = 1_700_000_000_000;
  const items = [
    { id: 'recent', text: '', embedding: [1, 0], storedAt: NOW - 1000, category: 'temporal' as const },
    { id: 'old',    text: '', embedding: [1, 0], storedAt: NOW - 30 * 24 * 60 * 60 * 1000, category: 'temporal' as const },
  ];
  const query = { id: 'q', text: '', embedding: [1, 0], relevant: new Set(['recent']), category: 'temporal' as const };

  it('without decay, ties broken by stable order', () => {
    const ranked = rank(items, query, { k: 2, useDecay: false }, NOW);
    expect(ranked.length).toBe(2);
    expect(ranked).toContain('recent');
    expect(ranked).toContain('old');
  });

  it('with decay, recent beats old when scores tie on similarity', () => {
    const ranked = rank(items, query, { k: 1, useDecay: true }, NOW);
    expect(ranked).toEqual(['recent']);
  });
});

describe('runEval', () => {
  it('produces a deterministic recall result on a synthetic corpus', () => {
    const { items, queries, nowMs } = buildSyntheticEval({ items: 100, queries: 50, seed: 7 });
    const r = runEval(items, queries, { k: 1, useDecay: false }, nowMs);
    expect(r.queries).toBe(50);
    expect(r.recall).toBeGreaterThan(0); // at least some queries find their target
    expect(r.recall).toBeLessThanOrEqual(1);
    expect(r.p95_latency_ms).toBeGreaterThanOrEqual(r.p50_latency_ms);
  });

  it('reports per-category breakdown that averages back to the overall recall', () => {
    const { items, queries, nowMs } = buildSyntheticEval({ items: 100, queries: 80, seed: 7 });
    const r = runEval(items, queries, { k: 3, useDecay: false }, nowMs);
    const cats = Object.values(r.by_category).filter(c => c.n > 0);
    const totalN = cats.reduce((s, c) => s + c.n, 0);
    expect(totalN).toBe(80);
    // Recall computed by-category should average to the overall recall.
    const weighted = cats.reduce((s, c) => s + c.recall * c.n, 0) / totalN;
    expect(weighted).toBeCloseTo(r.recall, 5);
  });

  it('k=10 recall >= k=1 recall (monotonic in k)', () => {
    const { items, queries, nowMs } = buildSyntheticEval({ items: 200, queries: 80, seed: 7 });
    const r1 = runEval(items, queries, { k: 1, useDecay: false }, nowMs);
    const r10 = runEval(items, queries, { k: 10, useDecay: false }, nowMs);
    expect(r10.recall).toBeGreaterThanOrEqual(r1.recall);
  });
});

describe('buildSyntheticEval reproducibility', () => {
  it('same seed -> same corpus + queries', () => {
    const a = buildSyntheticEval({ items: 20, queries: 10, seed: 42 });
    const b = buildSyntheticEval({ items: 20, queries: 10, seed: 42 });
    expect(a.items[0]!.embedding).toEqual(b.items[0]!.embedding);
    expect(a.queries[0]!.embedding).toEqual(b.queries[0]!.embedding);
  });

  it('different seed -> different corpus', () => {
    const a = buildSyntheticEval({ items: 20, queries: 10, seed: 1 });
    const b = buildSyntheticEval({ items: 20, queries: 10, seed: 2 });
    expect(a.items[0]!.embedding).not.toEqual(b.items[0]!.embedding);
  });
});

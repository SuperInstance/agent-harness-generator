#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Bench runner. Produces a JSON report comparing:
//   - useDecay=false   (HNSW baseline, no temporal weighting)
//   - useDecay=true    (kernel default with @ruvector/emergent-time)
//   - k=1 / k=3 / k=10 (ReasoningBank's k=1 claim should hold here too)

import { writeFileSync } from 'node:fs';
import { buildSyntheticEval, runEval, type RetrievalConfig, type RunResult } from './index.js';

const items = parseInt(process.env.BENCH_ITEMS ?? '2000', 10);
const queries = parseInt(process.env.BENCH_QUERIES ?? '500', 10);
const out = process.env.BENCH_OUT ?? './bench-report.json';

const { items: corpus, queries: q, nowMs } = buildSyntheticEval({ items, queries });

const configs: RetrievalConfig[] = [
  { k: 1, useDecay: false },
  { k: 1, useDecay: true, halfLifeMs: 7 * 24 * 60 * 60 * 1000 },
  { k: 3, useDecay: false },
  { k: 3, useDecay: true, halfLifeMs: 7 * 24 * 60 * 60 * 1000 },
  { k: 10, useDecay: false },
  { k: 10, useDecay: true, halfLifeMs: 7 * 24 * 60 * 60 * 1000 },
];

const results: RunResult[] = configs.map(cfg => runEval(corpus, q, cfg, nowMs));

const report = {
  schema: 1,
  generated_at: new Date().toISOString(),
  corpus_size: items,
  query_count: queries,
  baselines: {
    mem0_published: { judge_improvement_pct: 26, p95_latency_reduction_pct: 91, token_cost_reduction_pct: 90 },
    reasoningbank_published: { webarena_pp_improvement: 8.3, optimal_k: 1 },
  },
  results,
};

writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`Wrote ${out}`);
console.log('');
console.log(' config              recall   mrr      p50ms     p95ms');
for (const r of results) {
  const cfg = `k=${r.config.k} decay=${r.config.useDecay}`.padEnd(20);
  console.log(`  ${cfg} ${r.recall.toFixed(3)}    ${r.mrr.toFixed(3)}    ${r.p50_latency_ms.toFixed(2).padStart(7)}   ${r.p95_latency_ms.toFixed(2).padStart(7)}`);
}

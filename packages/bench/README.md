# @metaharness/bench

Reproducible memory-retrieval benchmark for the kernel's HNSW + decay pipeline.

## Run

```bash
npm run build && npm run bench
```

Tweak corpus + query counts via env vars:

```bash
BENCH_ITEMS=5000 BENCH_QUERIES=1000 BENCH_OUT=./report.json npm run bench
```

Output is a deterministic JSON report. Reproducible across CI runners.

## What it measures

Six configurations are scored side-by-side:

| Config | k | Decay |
|---|---|---|
| 1 | 1 | off |
| 2 | 1 | on |
| 3 | 3 | off |
| 4 | 3 | on |
| 5 | 10 | off |
| 6 | 10 | on |

Per config: `recall@k`, `MRR`, `p50_latency_ms`, `p95_latency_ms`, plus per-category breakdown across `single-hop`, `temporal`, `multi-hop`, `open-domain` evals.

## Baselines we compare against (in the report header)

| Source | What they reported |
|---|---|
| [Mem0](https://arxiv.org/abs/2504.19413) | +26% LLM-as-Judge over OpenAI memory baseline; 91% lower p95 latency; >90% token cost reduction |
| [ReasoningBank](https://research.google/blog/reasoningbank-enabling-agents-to-learn-from-experience/) | +8.3pp on WebArena with Gemini-2.5-Flash; **k=1 retrieval is optimal — more memory hurts** |

We don't run Mem0 or ReasoningBank in CI (their API keys + workloads aren't accessible from our test harness). The bench reproduces the EXPERIMENT SHAPE — same category mix, same retrieval-quality metric — so you can sanity-check the kernel's decay-vs-no-decay and k=1-vs-k=N empirically.

## What the ReasoningBank k=1 finding predicts

If `k=1 recall >= k=10 recall - epsilon` on the temporal category, the ReasoningBank result reproduces in our shape. If not, the decay path is over-eager or the corpus is too dense.

## License

MIT

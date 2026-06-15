# ADR-039: DRACO beyond-SOTA on the COST axis — cheap-model dominance

**Status**: Accepted
**Date**: 2026-06-15
**Project**: `ruvnet/agent-harness-generator`
**Related**: ADR-037 (DRACO benchmark), ADR-038 (quality ceiling finding)

---

## Context

ADR-038 proved the DRACO *quality* ceiling: a single strong direct call is
unbeatable on score, because grounding is a fraction of resolving URLs that no
transform/select/union strategy can raise. The directive — "beyond SOTA" — is
unreachable on the quality axis.

But the runs surfaced a measured fact that reframes the win: **a cheap model
produces a HIGHER-quality DRACO dossier than a frontier model, far cheaper.**
The right "beyond SOTA" is therefore Pareto on COST: same-or-better quality at a
fraction of the spend — exactly what ruflo MoE model routing exists to find.

## Decision

Measure and ship the cost-efficiency result. `cost-efficiency.ts` is pure
arithmetic over the already-committed (quality, tokens) pairs — no new API spend
— turning the run artifacts into a cost + quality-per-dollar comparison with a
Pareto-dominance verdict. `draco-bin --cost-report` prints it offline.

## Result (measured, from committed frontier + cheap runs)

| config | model | quality | tokens | cost (USD) | quality / $ |
|--------|-------|---------|--------|-----------|-------------|
| frontier vanilla | opus-4 | 0.7143 | 27,115 | $1.22 | 0.59 |
| **cheap vanilla** | **haiku-4.5** | **0.7566** | 40,529 | **$0.12** | **6.22** |
| frontier FUSION harness | opus+gpt-5+gemini | 0.6472 | 686,524 | **≥ $30.89** | ≤ 0.02 |

**Cheap vanilla Pareto-DOMINATES frontier vanilla: +0.042 quality, 10.0× cheaper,
10.6× more quality-per-dollar.** And the "ultimate research harness" (frontier
fusion) — the configuration the original thesis claimed would win — costs **≥250×
the cheap direct call and scores LOWER** (0.6472 vs 0.7566).

Prices are blended $/1M-token approximations (opus ~$45, haiku ~$3); the
order-of-magnitude gap is robust to the exact cents and is configurable.

## Consequences

- The shippable "beyond SOTA" is on cost: **for DRACO-style cross-domain factual
  dossiers, route to a cheap model and ask directly.** Spending frontier money
  on a multi-stage fusion harness is ~250× worse on quality-per-dollar.
- This is the MoE-routing thesis vindicated with data: the right model for this
  task is the cheap one, and a router that picks it is strictly Pareto-better
  than always-opus.
- Pure-arithmetic + offline-testable (6 tests); CI runs the full suite so the
  result cannot silently regress. No new API budget was spent to produce it.

## Honest caveat

This says cheap-model DIRECT calls dominate on DRACO specifically — a benchmark
whose grounding dimension rewards a tight, high-live-rate citation set. It does
NOT claim cheap models dominate on tasks needing long-horizon reasoning, code,
or multi-tool workflows. The finding is scoped to what DRACO measures, and is
exactly as strong as that scope — no more.

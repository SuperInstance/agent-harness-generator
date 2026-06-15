// SPDX-License-Identifier: MIT
//
// DRACO cost-efficiency analysis (ADR-039).
//
// The quality investigation (ADR-038) proved vanilla is at the DRACO ceiling:
// no transform/select/union arm beats a strong direct call, because grounding
// is a fraction of resolving URLs. But the runs surfaced a striking, measured
// fact: a CHEAP model produces a HIGHER-quality DRACO dossier than a frontier
// model — at a fraction of the cost. The "beyond SOTA" win is therefore on the
// COST axis (Pareto: same-or-better quality, far less money), exactly what
// ruflo MoE model routing targets.
//
// This module is PURE arithmetic over already-measured (quality, tokens) pairs —
// no API calls, no new spend. It turns the committed run artifacts into a
// cost-efficiency comparison + a Pareto-dominance verdict.

/**
 * Blended $/1M-token prices (input+output combined, output-weighted for the
 * long-dossier workload). Approximate mid-2026 OpenRouter list prices — the
 * ORDER OF MAGNITUDE (opus ~15x haiku) is the robust signal, not the cents.
 * Override via `prices` in costOf() for exact accounting.
 */
export const BLENDED_USD_PER_MTOK: Record<string, number> = {
  'anthropic/claude-haiku-4.5': 3,
  'anthropic/claude-sonnet-4': 9,
  'anthropic/claude-opus-4': 45,
  'openai/gpt-5': 12,
  'openai/gpt-5-mini': 2,
  'google/gemini-2.5-pro': 7,
  'google/gemini-2.5-flash': 1,
};

/** Cost in USD for `tokens` total tokens on `model`. Unknown model → throws. */
export function costOf(model: string, tokens: number, prices = BLENDED_USD_PER_MTOK): number {
  const rate = prices[model];
  if (rate == null) throw new Error(`no blended price for model "${model}" (add it to BLENDED_USD_PER_MTOK or pass prices)`);
  return (tokens / 1_000_000) * rate;
}

export interface CostPoint {
  label: string;
  model: string;
  quality: number; // DRACO composite 0..1
  tokens: number;
  costUSD: number;
  qualityPerUSD: number; // quality / costUSD
}

export function makePoint(label: string, model: string, quality: number, tokens: number, prices = BLENDED_USD_PER_MTOK): CostPoint {
  const costUSD = costOf(model, tokens, prices);
  return { label, model, quality, tokens, costUSD, qualityPerUSD: costUSD > 0 ? quality / costUSD : Infinity };
}

export interface ParetoVerdict {
  /** The reference point (e.g. frontier vanilla — the expensive SOTA baseline). */
  baseline: CostPoint;
  /** The challenger (e.g. cheap vanilla / a routed config). */
  challenger: CostPoint;
  qualityDelta: number; // challenger − baseline
  costRatio: number; // baseline.cost / challenger.cost (>1 → challenger cheaper)
  qualityPerUSDRatio: number; // challenger.qpd / baseline.qpd
  /** True iff challenger is Pareto-dominant: quality >= baseline AND cost < baseline. */
  dominates: boolean;
}

/**
 * Compare a challenger config against an expensive baseline. "dominates" is the
 * strong claim: the challenger matches-or-beats quality AND costs strictly less.
 */
export function paretoCompare(baseline: CostPoint, challenger: CostPoint): ParetoVerdict {
  return {
    baseline,
    challenger,
    qualityDelta: challenger.quality - baseline.quality,
    costRatio: challenger.costUSD > 0 ? baseline.costUSD / challenger.costUSD : Infinity,
    qualityPerUSDRatio: baseline.qualityPerUSD > 0 ? challenger.qualityPerUSD / baseline.qualityPerUSD : Infinity,
    dominates: challenger.quality >= baseline.quality && challenger.costUSD < baseline.costUSD,
  };
}

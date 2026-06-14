# ADR-029: Cross-Language Invariants and Defense-in-Depth Catalog Gates

**Status**: Accepted
**Date**: 2026-06-14
**Related**: ADR-007 (CI guards), ADR-008 (drift detection), ADR-010 (TDD test contracts), ADR-028 (Skew Detection and Liveness)
**Supersedes / Superseded-by**: none

## Context

By iter 87 the project had **three places** the template catalog was asserted:

1. **`packages/create-agent-harness/templates/catalog.json`** — source of truth, generated from `catalog.def.mjs`
2. **`packages/create-agent-harness/__tests__/generated-templates.test.ts`** (TypeScript) — `templates.length).toBe(N)` and `loaded.length).toBe(N)`
3. **`crates/template-catalog/src/lib.rs`** (Rust) — `assert_eq!(c.templates.len(), N, "expected N templates")`

iter 80 added `vertical:education` (16 → 17 templates). I updated (1) and (2) but missed (3). iter 83's CI run caught it red on all 3 OS targets two pushes later — `assertion left == right failed: expected 16 templates`. The fix in iter 85 was one line, but the architectural question was: **how do we make this drift class fail loudly at the earliest possible moment instead of in CI two pushes later?**

This pattern — "the same fact asserted in N implementations across N languages, all of which must agree" — recurs whenever a project crosses the JS↔Rust↔JSON boundary. We need a discipline for it.

iters 85-89 built a 4-layer defense-in-depth around it. This ADR captures the design so the same pattern can be reused for the next cross-language invariant we discover (host count, skill count, ADR count, etc.).

## Decision

### 1. The four defensive layers, ordered by failure-surface latency

The four layers must fail in the following order — fastest to slowest. A drift caught at layer K saves the time of running layers K+1 through 4.

| # | Layer | When it runs | What it catches |
|---|---|---|---|
| 1 | **`scripts/healthcheck.mjs` `catalogCount` check** | On every contributor laptop, pre-push, in `<1s` | Cross-language assertion drift: number in JSON vs number in TS test vs number in Rust test |
| 2 | **CI Node job `healthcheck` step** | On every push, per-OS-per-Node (6 matrix cells), in `<1s` | Same as layer 1, but for contributors who skipped the local run |
| 3 | **`examples/vertical-tour`** in the Node job | On every push, per-OS-per-Node, in `~1.1s` | A template that registers in TEMPLATES + catalog.json correctly (passing layer 1+2) but fails to actually scaffold or validate |
| 4 | **`generated-templates.test.ts` + `crates/template-catalog/tests`** | On every push, per-OS-per-Node, in `<2s` total | Per-template assertions about structure, agents, MCP servers — load-bearing details layers 1-3 don't check |

The architectural choice each layer encodes:

- **Layer 1** says: "the *number* must agree". Cheapest check; runs locally. Fails before push.
- **Layer 2** says: "if the contributor didn't run it locally, CI catches it". The same script, just in a different runner.
- **Layer 3** says: "even if the number agrees, prove each one *works*". This is the iter-83 class of bug — TS bumped to 17, Rust bumped to 17, but did the 17th template actually scaffold?
- **Layer 4** says: "even if scaffolds work, prove the *structure* is what we claim". Catches "scaffolded fine but the manifest has the wrong vars".

### 2. The cross-language counter recipe

For any invariant of the form "the same count appears in N implementations", we follow this recipe:

```js
// scripts/healthcheck.mjs — new check, modelled on iter-86 catalogCount
async <name>Count() {
  const sources = [
    { path: '<json>', extract: (json) => json.<array>.length },
    { path: '<ts-test>', extract: (text) => text.match(/<pattern>/)?.[1] },
    { path: '<rust-test>', extract: (text) => text.match(/<pattern>/)?.[1] },
    // future: { path: '<go-test>', extract: ... }
  ]
  const values = sources.map(s => s.extract(read(s.path)))
  if (new Set(values).size === 1) return PASS
  return FAIL with `expected ${values[0]}, got ${values.join('/')} in ${sources.map(s=>s.path)}`
}
```

The pattern has three load-bearing properties:

1. **One source of truth for the *count*** — JSON wins ties. The TS test and Rust test are derived assertions.
2. **The extract function lives next to the path** — no shared parser; each path-extract pair is independently editable.
3. **The check is in healthcheck, not in a one-off file** — runs on every contributor laptop pre-push *and* in CI, with one config block.

### 3. The end-to-end smoke gate

For invariants where "the count agrees" isn't enough — we also need "each instance actually works" — write a *tour* script analogous to:

- `examples/host-tour/host-tour.mjs` (iter 55) — proves the same scaffold works on all 6 hosts
- `examples/vertical-tour/vertical-tour.mjs` (iter 88) — proves all 17 verticals scaffold cleanly

Tour scripts have two non-obvious properties that distinguish them from per-instance unit tests:

1. **They read the BUILT registry**, not a hardcoded list. iter-88's vertical-tour imports `TEMPLATES` from `packages/create-agent-harness/dist/index.js`. If someone adds a template to `catalog.def.mjs` but forgets to update `TEMPLATES`, the tour automatically surfaces the drift — the missing template doesn't appear in TEMPLATES, so it's not scaffolded, so the tour doesn't catch it... **wait, that's a problem**.

   The fix (iter 88): the tour script SHOULD also assert the TEMPLATES export size matches `catalog.json.templates.length`. iter-86's `catalogCount` check covers this case for now; future tour scripts should encode the count assertion as a tour precondition.

2. **They emit a markdown table** for the human reader plus a `--json` mode for CI scripts. Same dual-output discipline as iter-73's `harness diag --json`.

### 4. When to add a new defense layer

The trigger for adding a new layer is a near-miss in CI. iter 83 was caught by layer 4 (the Rust unit test). iter 86 added layer 1 (healthcheck `catalogCount`) so the next iter-83-style miss would fail before push. iter 89 wired layer 3 (vertical-tour into CI) so a template that registers correctly but doesn't actually work fails per-push, not just on a contributor's laptop.

**Future trigger**: if a future CI catches a drift class that layers 1-4 missed, that drift class becomes the next layer. The discipline is: every red CI run that's caused by an avoidable structural drift should produce a healthcheck check, an ADR amendment, or a new tour.

### 5. Why this isn't "just more tests"

Three reasons:

- **Layers run on contributor laptops**, not just CI. The healthcheck check at layer 1 is the load-bearing piece — it shifts failure-surface to pre-push, saving the 10-minute CI cycle on every drift.
- **Layers are *per-class*, not per-instance**. Adding `vertical:sales` doesn't add 4 new tests; it adds zero, because the existing 4 layers cover every new vertical automatically. Compare to a per-vertical test file pattern — at 17 verticals × 4 layer concerns = 68 test files that would need maintenance.
- **Layers compose**. Layer 4's per-template structural assertion runs only if layer 3 says scaffolds work, which runs only if layer 2 says counts agree. A failure at layer 1 saves running layers 2-4. CI optimisation by definition.

## Consequences

**Good**:

- The iter-83-style "I bumped X but missed Y in another language" failure is now caught at layer 1 (pre-push, on the contributor's laptop) instead of layer 4 (CI on push N+1).
- Adding a new vertical is **two lines** in `catalog.def.mjs` + `TEMPLATES`. The 4-layer defense covers it automatically.
- The lesson loop is now visible in the source: `crates/template-catalog/src/lib.rs:111` cites iter 85 + iter 87 directly in its comment. Future contributors see the history.
- The discipline transfers: any new "the same count in N languages" invariant should follow the same recipe.

**Hurts**:

- Layer 1 (healthcheck) parses the TS test source code with a regex. If someone reformats the test in a way the regex doesn't match, the check silently goes SKIP. The mitigation is a unit test for the healthcheck check itself (`__tests__/healthcheck.test.ts`); it's tested but the regex is still fragile.
- Layer 3 (vertical-tour) takes 1.1 seconds. At ~10 future verticals (extrapolating from iter 80 + 87) it's maybe 2 seconds. We accept the linear cost because it catches the class of bug that has caused the most real CI red so far.

## Alternatives Considered

**A) Code-generate the Rust assertion from the TS test.** Tempting — one source of truth. Rejected: it would couple the Rust crate build to a Node toolchain at compile time, breaking the iter-12 "Rust crate is self-contained, no Node required to build" invariant. The cross-language count IS the spec; we don't need to generate it, just verify it agrees.

**B) Eliminate the Rust crate's count assertion.** Considered: just trust the TS test. Rejected: the Rust crate ships independently (consumers can use `template-catalog` as a cargo dep without ever touching Node). Its tests must hold up on their own.

**C) Replace the count assertion with "no missing templates" + "no extra templates" set-equality.** Considered: more robust to insertion-order changes. Rejected for now: the count is what catches the iter-83 class of bug because it's what changed (16 → 17). A set-equality check is more code without catching anything the count check doesn't.

**D) Use a JSON schema validator on catalog.json.** Considered: would catch shape regressions. Rejected as scope creep — schemas validate one thing (catalog.json's shape); cross-language counter agreement requires reading three sources. Future work could compose them.

## Test Contract

The architecture is considered shipped when ALL of these are green:

| # | Test | Pins |
|---|---|---|
| 1 | `__tests__/healthcheck.test.ts` "catalogCount agrees across catalog.json + TS test + Rust test" (iter 86) | Layer 1 wiring |
| 2 | `__tests__/healthcheck.test.ts` "runs all 8 checks by default" (iter 86) | catalogCount is in the default set |
| 3 | `__tests__/workflows.test.ts` "ci.yml runs vertical-tour as a per-push smoke gate (iter 89)" | Layer 3 wiring + ordering after healthcheck |
| 4 | `__tests__/examples-vertical-tour.test.ts` "scaffolds + validates every vertical on claude-code" (iter 88) | Layer 3 actually works |
| 5 | `packages/create-agent-harness/__tests__/generated-templates.test.ts` "has a schema and N templates" (iter 80 + 87) | Layer 4 (TS) — per-template structural pin |
| 6 | `crates/template-catalog/src/lib.rs::tests::embedded_json_parses` (iter 85 + 87) | Layer 4 (Rust) — per-template structural pin |

A PR that breaks any of (1)-(6) fails CI at the corresponding layer.

## References

- iter 80 — `vertical:education` shipped (catalog 16 → 17)
- iter 83 — CI caught the Rust assertion drift on all 3 OS targets
- iter 85 — One-line Rust hotfix + documented the lesson
- iter 86 — `healthcheck.catalogCount` shifts failure-surface from layer 4 to layer 1
- iter 87 — `vertical:sales` shipped (catalog 17 → 18); iter 86 enforced sync pre-push
- iter 88 — `examples/vertical-tour` proves all verticals actually work, not just register
- iter 89 — vertical-tour wired into CI as per-push gate
- ADR-028 — Skew Detection and Liveness (parallel "one probe, many surfaces" architecture)
- ADR-010 — TDD test contracts

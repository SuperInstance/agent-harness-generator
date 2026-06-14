# vertical-tour — scaffold + validate every vertical (iter 88)

> Brought up to date in iter 128.2: published CLI is now `metaharness` (https://www.npmjs.com/package/metaharness). User-facing invocations use `npx metaharness …`; the workspace-internal imports below still load the in-repo `packages/create-agent-harness/` build.

> 17 verticals scaffolded + validated in ~1 second on a clean checkout.

Analogue of [`examples/host-tour/`](../host-tour/): one script proves the whole catalog scaffolds cleanly. Adding a new vertical is two lines in `catalog.def.mjs` (plus the iter-86 healthcheck cross-language sync); this tour automatically covers it because it reads the `TEMPLATES` export from the built generator, not a hardcoded list.

## Run

```bash
node examples/vertical-tour/vertical-tour.mjs                # default host: claude-code
node examples/vertical-tour/vertical-tour.mjs --host=codex   # any of 6 hosts
node examples/vertical-tour/vertical-tour.mjs --json         # machine-readable
```

Output (~1s on a built checkout):

```
# Vertical Tour — output

| Template              | files | bytes | wall | validate |
|-----------------------|-------|-------|------|----------|
| `vertical:devops`     | 12    | 9.5K  | 72ms | HEALTHY  |
| ...                   | ...   | ...   | ...  | ...      |
| `vertical:education`  | 15    | 10.9K | 68ms | HEALTHY  |
| `vertical:sales`      | 15    | 10.8K | 63ms | HEALTHY  |
| `vertical:exotic`     | 13    |  8.6K | 67ms | HEALTHY  |

Total wall time: 1100ms across 17 verticals (host=claude-code).

[vertical-tour] DONE — 17/17 verticals HEALTHY in 1100ms
```

Exits non-zero with the names of the failing verticals if any vertical fails to scaffold or validate.

## Why this replaces per-vertical examples

iter 82 wrote `examples/education/` for vertical:education. iter 88 closes the per-vertical combinatorial trap: with 17 verticals × 6 hosts that's 102 unique scaffolds, and writing per-vertical examples would compound. One vertical-tour proves them all.

## What it demonstrates

| Layer | This script exercises |
|---|---|
| Scaffolder (iter 4) | `scaffold()` with every non-minimal template |
| TEMPLATES contract (iter 4 + iter 80 + iter 87) | Reads the built generator's `TEMPLATES` export |
| Validate umbrella (iter 20) | `harness validate --skip-gcp` → HEALTHY for every vertical |
| Diag chain (iter 76) | The umbrella includes the iter-66 diag informational check |

## Related

- [`examples/quickstart/`](../quickstart/) — single minimal scaffold
- [`examples/host-tour/`](../host-tour/) — same scaffold across all 6 HOSTS
- [`examples/federation/`](../federation/) — two-instance federation handshake
- [`examples/education/`](../education/) — single-vertical deep dive (iter 80)

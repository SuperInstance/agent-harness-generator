# Release runbook

How to ship a new version of the npm-published packages.

## What gets published

Every release publishes these packages **at the same version**:

| Package | What |
|---|---|
| `@ruflo/kernel` | The kernel — Rust → wasm + native (NAPI-RS) |
| `@ruflo/sdk` | Typed convenience helpers for harness authors |
| `@ruflo/host-claude-code` | Claude Code adapter |
| `@ruflo/host-codex` | Codex adapter |
| `@ruflo/host-pi-dev` | pi.dev adapter |
| `@ruflo/host-hermes` | Hermes adapter |
| `@ruflo/host-openclaw` | OpenClaw adapter |
| `@ruflo/host-rvm` | RVM adapter (hardware-isolated) |
| `create-agent-harness` | The scaffolder CLI (also ships `harness` binary) |

Version drift across the 9 packages is detected by `scripts/preflight.mjs`.

## Process

### 1. Pre-flight check (local)

```bash
node scripts/preflight.mjs
```

Gates:

- Git clean, on main
- Version consistent across all 9 packages
- Every published package has a README
- `publishConfig.access = "public"` on each
- `cargo fmt --check` + `cargo clippy -D warnings` + `cargo test`
- `wasm-pack build --release` + size budget < 500 KB
- `npm test`
- CHANGELOG mentions current iter
- LICENSE is MIT

If anything fails, fix before tagging.

### 2. Bump version

Update version in every package's `package.json` to the new semver:

```bash
# Edit by hand or use npm version (workspace-aware)
npm version --workspaces patch       # patch bump for all
```

### 3. Tag + push

```bash
git add .
git commit -m "chore(release): v0.1.1"
git tag v0.1.1
git push && git push --tags
```

### 4. Publish workflow fires

The push of `v*.*.*` triggers `.github/workflows/publish.yml`. The workflow:

1. Builds the matrix (wasm + 5 native targets)
2. Authenticates to GCP via Workload Identity Federation
3. Fetches `NPM_TOKEN` from Secret Manager
4. Runs `scripts/smoke.mjs` on the built artifacts
5. Publishes all 9 packages with `npm publish --provenance`

If your GCP variables aren't set, see [`setup/gcp-secrets.md`](setup/gcp-secrets.md) or run `scripts/setup-gcp.sh`.

### 5. Post-publish verification

```bash
# Each of the 9 packages should report the new version on @latest
for pkg in @ruflo/kernel @ruflo/sdk @ruflo/host-claude-code \
           @ruflo/host-codex @ruflo/host-pi-dev @ruflo/host-hermes \
           @ruflo/host-openclaw @ruflo/host-rvm create-agent-harness; do
  npm view "$pkg@latest" version
done
```

All 9 should report the version you just published.

### 6. Create the GitHub release

```bash
gh release create v0.1.1 --title "v0.1.1" --notes-file <(awk '/## \[Unreleased\]/,/## \[/' CHANGELOG.md | head -n -1)
```

Or via the GitHub UI — paste the CHANGELOG section.

### 7. Bump CHANGELOG to next unreleased

Add a new `## [Unreleased]` section above the just-released entries.

## Rollback

If a release ships broken:

1. **npm deprecate** — don't unpublish; deprecate with a clear message:
   ```bash
   npm deprecate '@ruflo/kernel@0.1.1' 'broken — use 0.1.0'
   # repeat for each affected package
   ```
2. Fix the bug
3. Cut a patch release per the normal process

Unpublishing is a last resort — npm only allows it within 72 hours and only if no other published package depends on the version.

## Local-only test publish (dry run)

To validate the workflow shape without actually publishing:

```bash
gh workflow run publish.yml --ref main -f dry_run=true
```

This runs the workflow with the publish steps replaced by `--dry-run`. Useful to confirm GCP auth + Secret Manager fetch work before a real tag.

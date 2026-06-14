# Agent Harness Generator — Web UI

A **100% client-side** generator for AI agent harnesses and Claude skills/agents/commands. Pick primitives, pick content, supply identity → download a zip. No backend, no install, nothing leaves your browser. Deployable to GitHub Pages; desktop- and mobile-friendly.

> Design rationale: [ADR-020 — Web generator UI](../../docs/adrs/ADR-020-web-generator-ui.md) · [ADR-021 — Client-side packaging + Pages deploy](../../docs/adrs/ADR-021-client-side-packaging-and-pages-deploy.md)

![Desktop](../../docs/web-ui/screenshot-desktop.png)

## Two modes

| Mode | What you get |
|---|---|
| **Full harness** | Name, host(s), template, kernel options, and a composable pick-list of agents / skills / commands. Live file tree + viewer. Downloads the whole scaffold as `<name>.zip`, byte-compatible with `create-agent-harness`. |
| **Skill / Agent / Command** | Author or pick a single artifact. Skills emit a `SKILL.md` with YAML frontmatter in their own folder — drop straight into Claude desktop / claude.ai. Download as `.md` or `.zip`. |

<p align="center">
  <img src="../../docs/web-ui/screenshot-artifact.png" width="48%" alt="Artifact mode" />
  <img src="../../docs/web-ui/screenshot-mobile.png" width="24%" alt="Mobile" />
</p>

## Develop

```bash
cd apps/web-ui
npm install
npm run dev        # http://localhost:5173 (served at root)
```

## Test

```bash
npm test           # 27 generator unit tests (Vitest)
npm run e2e        # Playwright e2e — desktop + mobile, asserts zero console errors
npm run shot       # regenerate the README screenshots
```

## Build & deploy

```bash
npm run build              # base = /agent-harness-generator/ (GitHub Pages subpath)
VITE_BASE=/ npm run build  # base = / (custom domain or root deploy)
npm run preview
```

Pushing changes under `apps/web-ui/**` to `main` triggers [`.github/workflows/pages.yml`](../../.github/workflows/pages.yml), which runs the unit + e2e gates and then deploys to GitHub Pages. The deploy is blocked if either gate is red.

### Base path

The Vite `base` defaults to `/agent-harness-generator/` for Pages. Override with `VITE_BASE=/` for local/root serving, or set it to your own subpath if you fork under a different repo name.

## How it stays faithful to the CLI

`src/generator/render.ts` is a behaviour-for-behaviour port of `packages/create-agent-harness/src/renderer.ts` — same `{{var}}` templating, same `validateHarnessName` rules, same per-host file shapes (ADR-004). A parity test pins it so the web path can't silently drift from what `npx create-agent-harness` produces.

## Layout

```
apps/web-ui/
├─ src/
│  ├─ generator/        # framework-free generator core (ported + tested)
│  │  ├─ render.ts      # {{var}} renderer + name validation (CLI parity)
│  │  ├─ catalog.ts     # hosts, templates, agents, skills, commands
│  │  ├─ artifacts.ts   # single Claude SKILL.md / agent / command builders
│  │  ├─ scaffold.ts    # full harness file tree
│  │  ├─ zip.ts         # JSZip + Blob download (deterministic)
│  │  └─ __tests__/     # 27 unit tests
│  ├─ components/       # HarnessBuilder, ArtifactBuilder, FileTree, ui
│  └─ App.tsx
├─ e2e/                 # Playwright desktop + mobile specs
└─ scripts/screenshot.mjs
```

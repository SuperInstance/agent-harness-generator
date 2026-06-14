# @ruflo/vertical-base

Shared contract for [`@ruflo/vertical-*`](https://github.com/ruvnet/agent-harness-generator) packs — the type-only / runtime-helper module that every standalone vertical pack consumes so the generator can load them uniformly.

## What it is

Per [ADR-013](https://github.com/ruvnet/agent-harness-generator/blob/main/docs/adrs/ADR-013-vertical-packs-publishing.md), vertical packs (trading, legal, research, …) are **published as standalone npm packages** so each can be owned by a domain expert without touching `create-agent-harness`. This module is the contract those packs implement.

```
@ruflo/vertical-base               <- shared contract (this package)
  ↑
  ├── @ruflo/vertical-trading      <- standalone pack, ships independently
  ├── @ruflo/vertical-legal        <- standalone pack
  ├── @ruflo/vertical-research     <- standalone pack
  └── ...                          <- third-party packs implement the same interface
```

## What's exported

| Export | Purpose |
|---|---|
| `VerticalPack` (type) | Top-level interface each pack default-exports |
| `VerticalManifest` (type) | Single template's manifest shape (`vars`, `files`, `agents`, `skills`, `commands`, …) |
| `TemplateVar` / `TemplateFileEntry` | Building blocks for manifests |
| `loadVerticalPack(modulePath)` | Runtime loader the CLI uses to ingest external packs |
| `validateManifest(m)` | Pre-publish + load-time sanity check |

## Authoring a new vertical pack

```ts
// my-pack/src/index.ts
import type { VerticalPack } from '@ruflo/vertical-base';

const pack: VerticalPack = {
  id: 'my-vertical',
  displayName: 'My Custom Vertical',
  templates: [
    {
      id: 'my-template',
      vars: [{ name: 'name', prompt: 'Harness name', default: 'my-bot' }],
      files: [
        { src: 'templates/CLAUDE.md', dst: 'CLAUDE.md', render: true },
      ],
      agents: [ /* ... */ ],
      skills: [ /* ... */ ],
      commands: [ /* ... */ ],
    },
  ],
};

export default pack;
```

Then publish as `@your-scope/vertical-my-vertical` and users can load it:

```bash
npx create-agent-harness my-bot --vertical @your-scope/vertical-my-vertical
```

## Why a separate package?

- **Independent ownership** — domain experts publish without PRing the generator
- **Independent cadence** — a vertical can bump without touching the kernel
- **Cleaner attack surface** — the generator never executes pack code at scaffold time; it only reads manifests
- **Lock-step versioning** — packs declare `peerDependencies` on `@ruflo/vertical-base` so breaking-shape changes are visible at install time

## See also

- [ADR-013 — Vertical packs publishing](https://github.com/ruvnet/agent-harness-generator/blob/main/docs/adrs/ADR-013-vertical-packs-publishing.md)
- [`@ruflo/vertical-trading`](https://www.npmjs.com/package/@ruflo/vertical-trading) — reference implementation
- [`create-agent-harness`](https://www.npmjs.com/package/create-agent-harness) — consumer

## License

MIT

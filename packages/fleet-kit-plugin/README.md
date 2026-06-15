# @superinstance/fleet-kit-plugin

**Metaharness plugin** that adds `--with-fleet` integration to the
[agent-harness-generator](https://github.com/SuperInstance/agent-harness-generator)
create-agent-harness pipeline.

## What It Does

When enabled, this plugin transforms a generated harness into a
**fleet-aware participant** of the SuperInstance fleet:

| Feature | Description |
|---------|-------------|
| **Fleet-coordinator agent** | Dedicated agent with fleet protocol system prompt |
| **Fleet-registration MCP server** | Wraps `scripts/fleet-scout.sh` for registration/ping |
| **GC-report MCP server** | Wraps `scripts/gc-self-audit.sh` for GC reporting |
| **Fleet protocol files** | Generates `AGENTS.md`, `FLEET_PROTOCOL.md`, `.gcconfig`, vessel structure, and monitoring scripts |
| **Status marker** | Marks the harness as `fleet-capable` |

## Usage

### Via CLI (recommended)

```bash
npx create-agent-harness MyHarness --with-fleet
```

### Via API

```ts
import { applyPlugin, generateFleetFiles } from '@superinstance/fleet-kit-plugin';

// Add fleet integration to a spec
const spec = applyPlugin(mySpec, { withFleet: true });

// Generate the fleet protocol files for any harness name
const files = generateFleetFiles('MyHarness');
// → { 'AGENTS.md': '...', '.gcconfig': '...', 'scripts/fleet-scout.sh': '...', ... }
```

### Registering CLI flag in a custom program

```ts
import { registerFleetCLI } from '@superinstance/fleet-kit-plugin';

registerFleetCLI(program);
// → Adds --with-fleet option
```

## Plugin Composition

The plugin works as a pipeline step that:

1. Reads the resolved `HarnessSpec` from `@metaharness/kernel`
2. When `--with-fleet` is set, injects the coordinator agent and MCP servers
3. Generates fleet protocol files alongside the host adapter's config files
4. Marks the harness status as `fleet-capable`

The fleet protocol templates live in `src/templates.ts` and are shared
with `@metaharness/host-openclaw` to keep content in sync.

## File Output

When `--with-fleet` is active, the generated harness includes:

```
AGENTS.md                  # Fleet constitution
FLEET_PROTOCOL.md          # Fleet protocol docs
.gcconfig                  # GC policy manifest
i2i-vessel/
  SESSION-STATE.md         # Cold-start bootstrap
  bottles/                 # Bottles directory (created by scripts)
  TASK/                    # Incoming fleet work items
scripts/
  fleet-scout.sh           # Registration, ping, status
  gc-self-audit.sh         # GC reporting
```

## API Reference

### `plugin`

```ts
const plugin: { name: 'fleet-kit'; version: '0.1.0' };
```

Plugin metadata exported for Metaharness discovery.

### `applyPlugin(spec, options)`

```ts
function applyPlugin(
  spec: HarnessSpec,
  options: { withFleet: boolean },
): HarnessSpec;
```

Returns a new spec with fleet agents, MCP servers, and status line injected.

### `generateFleetFiles(harnessName)`

```ts
function generateFleetFiles(harnessName: string): Record<string, string>;
```

Returns a map of file path → file content for all fleet protocol files.

### `registerFleetCLI(program)`

```ts
function registerFleetCLI(program: { option: (f: string, d: string) => unknown }): void;
```

Adds `--with-fleet` option to a Commander-like CLI program.

### `expectedFleetFiles()`

```ts
function expectedFleetFiles(): string[];
```

Returns the list of expected fleet protocol file paths (relative to harness root).

## Development

```bash
# Build
npm run build

# Test
npm test
```

## License

MIT

// SPDX-License-Identifier: MIT
//
// @superinstance/fleet-kit-plugin — SuperInstance fleet integration plugin
// for agent-harness-generator (Metaharness plugin system).
//
// This plugin adds --with-fleet support to create-agent-harness:
//   - Fleet-coordinator agent injection
//   - Fleet MCP server registration (fleet-registration, gc-report)
//   - Fleet protocol file generation (AGENTS.md, .gcconfig, etc.)
//   - CLI flag plumbing

import type { HarnessSpec, AgentSpec, McpServerSpec } from '@metaharness/kernel';
import {
  generateFleetFiles,
} from './templates.js';

// ---------------------------------------------------------------------------
// Plugin metadata
// ---------------------------------------------------------------------------

/**
 * FleetPlugin conforms to the Metaharness plugin contract.
 * The `name` is scoped to avoid collisions.
 */
export const plugin = {
  name: 'fleet-kit',
  version: '0.1.0',
} as const;

// ---------------------------------------------------------------------------
// Spec mutation
// ---------------------------------------------------------------------------

/**
 * Apply fleet integration to a HarnessSpec.
 *
 * When `options.withFleet` is true, the spec is mutated in place and
 * returned with:
 *   - An additional `fleet-coordinator` agent
 *   - `fleet-registration` and `gc-report` MCP servers
 *   - A `statusLine` marker indicating fleet capability
 *
 * When false (or omitted), the spec is returned unchanged.
 */
export function applyPlugin(
  spec: HarnessSpec,
  options: { withFleet: boolean },
): HarnessSpec {
  if (!options.withFleet) return spec;

  // ── fleet-coordinator agent ──────────────────────────────────────────
  const coordinatorAgent: AgentSpec = {
    name: 'fleet-coordinator',
    systemPrompt: [
      '# Fleet Coordinator Agent',
      '',
      'You are the fleet coordinator for this harness.',
      'Your responsibilities:',
      '',
      '1. **Fleet Registration**: On start, run `scripts/fleet-scout.sh register`',
      '   or `scripts/fleet-scout.sh ping` to announce presence.',
      '2. **GC Reporting**: After batch writes, run `scripts/gc-self-audit.sh`',
      '   to report disk/RAM/load to the fleet GC ledger.',
      '3. **I2I Vessel**: Maintain `i2i-vessel/` — write bottles for any',
      '   state that should survive across sessions.',
      '4. **Fleet Constitution**: Read `AGENTS.md` and `FLEET_PROTOCOL.md`',
      '   for full fleet rules and service port map.',
      '5. **Tier**: This harness operates at `hot` tier — rapid GC if pressure > 80%.',
      '',
      'When in doubt, check AGENTS.md first.',
    ].join('\n'),
  };

  // ── Fleet MCP servers ────────────────────────────────────────────────
  const fleetRegistrationServer: McpServerSpec = {
    name: 'fleet-registration',
    command: ['scripts/fleet-scout.sh'],
    env: [['HARBOR_URL', 'http://localhost:8797']],
  };

  const gcReportServer: McpServerSpec = {
    name: 'gc-report',
    command: ['scripts/gc-self-audit.sh'],
    env: [['HARBOR_URL', 'http://localhost:8797']],
  };

  // ── Mutate spec ──────────────────────────────────────────────────────
  const agents = [...(spec.agents ?? []), coordinatorAgent];
  const mcpServers = [
    ...(spec.mcpServers ?? []),
    fleetRegistrationServer,
    gcReportServer,
  ];

  return {
    ...spec,
    agents,
    mcpServers,
    statusLine: spec.statusLine
      ? `${spec.statusLine} | fleet-capable`
      : 'fleet-capable',
  };
}

// ---------------------------------------------------------------------------
// File generation
// ---------------------------------------------------------------------------

export { generateFleetFiles } from './templates.js';

// ---------------------------------------------------------------------------
// CLI registration
// ---------------------------------------------------------------------------

/**
 * Register the --with-fleet CLI option on a Commander-like program object.
 *
 * The `program` argument should expose `option(flags: string, description: string)`.
 *
 * Usage (in create-agent-harness CLI):
 * ```ts
 * import { registerFleetCLI } from '@superinstance/fleet-kit-plugin';
 * registerFleetCLI(program);
 * ```
 */
export function registerFleetCLI(program: {
  option: (flags: string, description: string) => unknown;
}): void {
  program.option(
    '--with-fleet',
    'Enable fleet integration (coordinator agent, fleet MCP servers, protocol files)',
  );
}

// ---------------------------------------------------------------------------
// Reconciliation helper: verify fleet files exist in a harness directory
// ---------------------------------------------------------------------------

/**
 * Returns the list of expected fleet protocol file paths (relative to
 * the harness root). Useful for post-generation validation.
 */
export function expectedFleetFiles(): string[] {
  return [
    'AGENTS.md',
    'FLEET_PROTOCOL.md',
    '.gcconfig',
    'scripts/fleet-scout.sh',
    'scripts/gc-self-audit.sh',
    'i2i-vessel/SESSION-STATE.md',
  ];
}

// SPDX-License-Identifier: MIT
//
// @metaharness/host-openclaw — OpenClaw host adapter (SuperInstance fork)
//
// Enhanced with fleet protocol support: AGENTS.md, .gcconfig, fleet-scout.sh
// Every generated harness becomes a fleet-aware participant.
//
// SuperInstance fleet integration:
//   - AGENTS.md — fleet constitution (what rules this harness follows)
//   - .gcconfig — GC policy manifest for the generated harness
//   - FLEET_PROTOCOL.md — how this harness participates in the fleet
//   - i2i-vessel/ — local vessel directory structure
//   - scripts/fleet-scout.sh — fleet monitoring script
//   - scripts/gc-self-audit.sh — local GC reporting

import type { HostAdapter, HarnessSpec, McpServerSpec } from '@metaharness/kernel';

export const HOST_NAME = 'openclaw' as const;

export interface OpenClawMcpServerEntry {
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

export function serverToOpenClaw(s: McpServerSpec): OpenClawMcpServerEntry {
  const entry: OpenClawMcpServerEntry = {};
  if (s.command && s.command.length > 0) {
    entry.command = s.command[0];
    if (s.command.length > 1) entry.args = s.command.slice(1);
  } else if (s.url) {
    entry.url = s.url;
  }
  if (s.env && s.env.length > 0) {
    entry.env = Object.fromEntries(s.env);
  }
  return entry;
}

export function configJson(spec: HarnessSpec): string {
  const mcpServers: Record<string, OpenClawMcpServerEntry> = {};
  for (const s of spec.mcpServers ?? []) {
    mcpServers[s.name] = serverToOpenClaw(s);
  }
  return JSON.stringify({ mcp_servers: mcpServers }, null, 2) + '\n';
}

export function skillMarkdown(spec: HarnessSpec): string {
  const lines: string[] = [];
  lines.push('---');
  lines.push(`name: ${spec.name}`);
  if (spec.description) {
    const desc = spec.description
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/[\r\n]+/g, ' ');
    lines.push(`description: "${desc}"`);
  }
  lines.push('---');
  lines.push('');
  lines.push(`# ${spec.name}`);
  lines.push('');
  if (spec.description) lines.push(spec.description, '');
  if (spec.systemPrompt) {
    lines.push('## System Prompt');
    lines.push('');
    lines.push(spec.systemPrompt);
    lines.push('');
  }
  if (spec.agents && spec.agents.length > 0) {
    lines.push('## Agents');
    lines.push('');
    for (const a of spec.agents) {
      lines.push(`- **${a.name}**: ${a.systemPrompt ?? ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function agentsMarkdown(spec: HarnessSpec): string {
  const fleetRepo = 'https://github.com/SuperInstance/baton-system';
  return [
    '---',
    'name: ' + spec.name,
    'fleet: superinstance',
    'tier: hot',
    'version: 1',
    '---',
    '',
    `# AGENTS.md — Fleet Constitution for ${spec.name}`,
    '',
    '> This harness is a fleet-aware participant in the SuperInstance fleet.',
    '> Read this FIRST if you are an agent entering this repository.',
    '',
    '## Fleet Protocol',
    '',
    '- **Registry**: ' + fleetRepo,
    '- **I2I Vessel**: `i2i-vessel/` — shared state via bottles',
    '- **GC Config**: `.gcconfig` — GC policy manifest',
    '- **Fleet Scout**: `scripts/fleet-scout.sh` — health reporting',
    '',
    '## Rules of Engagement',
    '',
    '1. **Report to fleet** on start: `scripts/fleet-scout.sh ping`',
    '2. **Write bottles** for any state that should survive the session',
    '3. **Respect `.gcconfig`** — do not write outside allowed paths',
    '4. **Check AGENTS.md** in any cloned repo before editing',
    '5. **Submit to GC** after any batch write: `scripts/gc-self-audit.sh`',
    '',
    '## Fleet Services',
    '',
    '| Service | Protocol | Default Port |',
    '|---------|----------|-------------|',
    '| Harbor (I2I) | TCP/HTTP | 8796/8797 |',
    '| Conservation Meter | UDP | 8798 |',
    '| Rotation Feed | UDP | 8799 |',
    '| Headspace (Vector) | HTTP | 9090 |',
    '| Colony API | HTTP | 8820 |',
    '| Colony Market | HTTP | 8822 |',
    '| Colony Games | HTTP | 8823 |',
    '',
    'See `FLEET_PROTOCOL.md` for detailed integration instructions.',
    '',
  ].join('\n');
}

export function fleetProtocolMarkdown(spec: HarnessSpec): string {
  return [
    `# Fleet Protocol for ${spec.name}`,
    '',
    'This document describes how this harness participates in the SuperInstance fleet.',
    '',
    '## I2I Vessel Protocol',
    '',
    'The `i2i-vessel/` directory provides shared state across sessions:',
    '',
    '```',
    'i2i-vessel/',
    '├── bottles/        # Bottles — timestamped, named state snapshots',
    '│   └── *.bottle.md',
    '├── SESSION-STATE.md # Cold-start bootstrap (last known state)',
    '└── TASK/           # Incoming work items from fleet',
    '```',
    '',
    '### Bottle Format',
    '',
    'Each bottle is a markdown file in `bottles/` with:',
    '- **Title line**: `# Bottle: <name> — <timestamp>`',
    '- **Body**: Free-form markdown, structured as needed',
    '',
    '### Harbor Integration',
    '',
    'If harbor-daemon is running on :8796/:8797, bottles can be:',
    '- **Written** via POST to `http://localhost:8797/bottle`',
    '- **Read** via GET from `http://localhost:8797/bottles`',
    '- **Queried** via GET `http://localhost:8797/bottle/<name>`',
    '',
    '## GC Protocol',
    '',
    'The `.gcconfig` file defines GC policy. To submit a GC report:',
    '',
    '```bash',
    'scripts/gc-self-audit.sh',
    '```',
    '',
    'This reports disk/RAM/load to the fleet GC ledger and triggers',
    'a cleanup pass if pressure exceeds the configured threshold.',
    '',
    '## Fleet Registration',
    '',
    'On first start, the harness should register with the fleet:',
    '',
    '```bash',
    'scripts/fleet-scout.sh register',
    '```',
    '',
    'Subsequently, on each start:',
    '',
    '```bash',
    'scripts/fleet-scout.sh ping',
    '```',
    '',
    '## Fleet Coordination',
    '',
    '- **Construct-coordination repo**: SuperInstance/construct-coordination',
    '  - Fleet status reports go in `notes/{instance-name}/`',
    '  - Cross-instance communication via repo issues and bottles',
    '',
    '- **Baton-system repo**: SuperInstance/baton-system',
    '  - Fleet constitution (this file\'s source of truth)',
    '  - Fleet tier structure: `tiers/hot/`, `tiers/warm/`, `tiers/cold/`',
    '  - GC docs at `docs/GC_AGENTS.md` and `docs/gc-intelligent-README.md`',
    '',
  ].join('\n');
}

export function gcConfigToml(spec: HarnessSpec): string {
  return [
    `# .gcconfig — GC Policy for ${spec.name}`,
    '# Generated by @metaharness/host-openclaw (SuperInstance fork)',
    '',
    '[gc]',
    'tier = "hot"',
    'setpoint = 20              # Target free space %',
    'aggression_min = 0.5',
    'aggression_max = 5.0',
    'compost_ttl_hours = 72',
    '',
    '[paths]',
    'immortal = ["AGENTS.md", "FLEET_PROTOCOL.md", ".gcconfig"]',
    'protected = ["node_modules/", "dist/"]',
    'evictable = ["logs/", "i2i-vessel/bottles/archive/", "tmp/"]',
    '',
    '[reporting]',
    'harbor_url = "http://localhost:8797"',
    'ledger_name = "gc-report"',
    'auto_report = true',
    '',
  ].join('\n');
}

export function fleetScoutScript(spec: HarnessSpec): string {
  return [
    '#!/usr/bin/env bash',
    `# fleet-scout.sh for ${spec.name}`,
    '# Register, ping, or diagnose fleet connectivity.',
    'set -euo pipefail',
    '',
    'NAME=' + spec.name,
    'HARBOR="${HARBOR_URL:-http://localhost:8797}"',
    'REGISTRY="${FLEET_REGISTRY:-http://localhost:18789}"  # OpenClaw gateway',
    '',
    'cmd="${1:-status}"',
    '',
    'case "$cmd" in',
    '  register)',
    '    echo "[fleet] Registering $NAME..."',
    '    curl -s -X POST "$HARBOR/bottle" \\',
    '      -H "Content-Type: text/markdown" \\',
    `      -d "# Bottle: fleet-register-${spec.name}\n\n$(date -u +%Y-%m-%dT%H:%M:%SZ): $NAME registering with fleet"`,
    '    echo ""',
    '    echo "[fleet] Registered."',
    '    ;;',
    '',
    '  ping)',
    '    echo "[fleet] Ping from $NAME at $(date -u +%Y-%m-%dT%H:%M:%SZ)"',
    '    curl -s -o /dev/null -w "%{http_code}" "$HARBOR/bottle" \\',
    '      -X POST -H "Content-Type: text/markdown" \\',
    `      -d "# Bottle: fleet-ping-${spec.name}\n\nheartbeat $(date -u +%s)" \\`,
    '      2>/dev/null || echo "unreachable"',
    '    echo ""',
    '    ;;',
    '',
    '  status)',
    '    echo "=== Fleet Status for $NAME ==="',
    '    echo "Harbor: $HARBOR"',
    '    echo "Registry: $REGISTRY"',
    '    echo "Uptime: $(uptime -p)"',
    '    echo "Disk: $(df -h / | tail -1 | awk \'{print $5, $4}\')"',
    '    echo "Harness: $(pwd)"',
    '    ;;',
    '',
    '  *)',
    '    echo "Usage: $0 {register|ping|status}"',
    '    exit 1',
    '    ;;',
    'esac',
    '',
  ].join('\n');
}

export function gcSelfAuditScript(spec: HarnessSpec): string {
  return [
    '#!/usr/bin/env bash',
    `# gc-self-audit.sh for ${spec.name}`,
    '# Reports disk/RAM/load to fleet GC ledger.',
    'set -euo pipefail',
    '',
    'NAME=' + spec.name,
    'HARBOR="${HARBOR_URL:-http://localhost:8797}"',
    'HERE="$(cd "$(dirname "$0")/.." && pwd)"',
    '',
    '# Gather metrics',
    'DISK_PCT=$(df / | tail -1 | awk \'{print $5}\' | tr -d %)',
    'DISK_FREE=$(df / | tail -1 | awk \'{print $4}\')',
    'MEM_USED=$(free | awk \'/Mem:/ {printf "%.0f", $3/$2 * 100}\')',
    'LOAD=$(uptime | awk -F\'load average:\' \'{print $2}\' | cut -d, -f1 | tr -d " ")',
    '',
    'TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    '',
    'cat <<BOTTLE | curl -s -X POST "$HARBOR/bottle" -H "Content-Type: text/markdown" --data-binary @- >/dev/null',
    `# Bottle: gc-audit-${spec.name} — ${TIMESTAMP}`,
    '',
    '- **instance**: ' + spec.name,
    '- **timestamp**: ${TIMESTAMP}',
    '- **disk_pct**: ${DISK_PCT}',
    '- **disk_free**: ${DISK_FREE}',
    '- **mem_pct**: ${MEM_USED}',
    '- **load**: ${LOAD}',
    '- **pwd**: ${HERE}',
    'BOTTLE',
    '',
    'echo "[gc-audit] Reported at ${TIMESTAMP}: disk=${DISK_PCT}% free=${DISK_FREE} mem=${MEM_USED}% load=${LOAD}"',
    '',
  ].join('\n');
}

export function installScript(spec: HarnessSpec): string {
  const lines: string[] = [];
  lines.push('#!/usr/bin/env bash');
  lines.push(`# OpenClaw + Fleet install runbook for ${spec.name}`);
  lines.push('set -euo pipefail');
  lines.push('');
  lines.push('# 1. Install OpenClaw if missing');
  lines.push('command -v openclaw >/dev/null 2>&1 || npm install -g openclaw@latest');
  lines.push('');
  lines.push('# 2. Onboard + install daemon (idempotent on re-run)');
  lines.push('openclaw onboard --install-daemon || true');
  lines.push('');
  lines.push('# 3. Merge MCP servers into ~/.openclaw/openclaw.json');
  lines.push('echo "---"');
  lines.push('echo "Step: Merge openclaw.json into ~/.openclaw/openclaw.json under mcp_servers."');
  lines.push('echo "---"');
  lines.push('');
  lines.push('# 4. Drop the skill into the workspace');
  lines.push(`mkdir -p "$HOME/.openclaw/workspace/skills/${spec.name}"`);
  lines.push(`cp ./SKILL.md "$HOME/.openclaw/workspace/skills/${spec.name}/SKILL.md"`);
  lines.push('');
  lines.push('# 5. Set up fleet protocol');
  lines.push('mkdir -p i2i-vessel/bottles i2i-vessel/TASK');
  lines.push(`echo "# SESSION-STATE for ${spec.name}" > i2i-vessel/SESSION-STATE.md`);
  lines.push('chmod +x scripts/fleet-scout.sh scripts/gc-self-audit.sh');
  lines.push('');
  lines.push('# 6. Register with fleet');
  lines.push('./scripts/fleet-scout.sh register || echo "Fleet not reachable (expected on first run)"');
  lines.push('');
  lines.push(`echo "Done. Try: openclaw agent --message \\"${spec.name}: ping\\""`);
  return lines.join('\n') + '\n';
}

/**
 * Generate all fleet protocol files for a harness.
 */
export function fleetProtocolFiles(spec: HarnessSpec): Record<string, string> {
  return {
    'AGENTS.md': agentsMarkdown(spec),
    'FLEET_PROTOCOL.md': fleetProtocolMarkdown(spec),
    '.gcconfig': gcConfigToml(spec),
    'scripts/fleet-scout.sh': fleetScoutScript(spec),
    'scripts/gc-self-audit.sh': gcSelfAuditScript(spec),
    'i2i-vessel/SESSION-STATE.md': `# SESSION-STATE for ${spec.name}\n\n_Last boot: pending_\n\n`,
  };
}

export const adapter: HostAdapter = {
  name: HOST_NAME,
  generateConfig: (spec: HarnessSpec) => ({
    'openclaw.json': configJson(spec),
    'SKILL.md': skillMarkdown(spec),
    'install-openclaw.sh': installScript(spec),
    ...fleetProtocolFiles(spec),
  }),
};

export default adapter;

// SPDX-License-Identifier: MIT
//
// @superinstance/fleet-kit-plugin — Fleet protocol templates
//
// These template strings are the canonical source of fleet protocol
// file content. They are consumed by both:
//   - @superinstance/fleet-kit-plugin   (this package)
//   - @metaharness/host-openclaw        (imported via adapter)
//
// Any change to fleet protocol content should be made here first,
// then the host-openclaw adapter updated to re-import.

// ---------------------------------------------------------------------------
// AGENTS_TEMPLATE — Fleet constitution markdown
// ---------------------------------------------------------------------------
export function AGENTS_TEMPLATE(harnessName: string): string {
  const fleetRepo = 'https://github.com/SuperInstance/baton-system';
  return [
    '---',
    'name: ' + harnessName,
    'fleet: superinstance',
    'tier: hot',
    'version: 1',
    '---',
    '',
    `# AGENTS.md — Fleet Constitution for ${harnessName}`,
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

// ---------------------------------------------------------------------------
// FLEET_PROTOCOL_TEMPLATE
// ---------------------------------------------------------------------------
export function FLEET_PROTOCOL_TEMPLATE(harnessName: string): string {
  return [
    `# Fleet Protocol for ${harnessName}`,
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

// ---------------------------------------------------------------------------
// GCCONFIG_TEMPLATE — GC policy TOML
// ---------------------------------------------------------------------------
export function GCCONFIG_TEMPLATE(harnessName: string): string {
  return [
    `# .gcconfig — GC Policy for ${harnessName}`,
    '# Generated by @superinstance/fleet-kit-plugin',
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

// ---------------------------------------------------------------------------
// FLEET_SCOUT_TEMPLATE — Fleet monitoring shell script
// ---------------------------------------------------------------------------
export function FLEET_SCOUT_TEMPLATE(harnessName: string): string {
  return [
    '#!/usr/bin/env bash',
    `# fleet-scout.sh for ${harnessName}`,
    '# Register, ping, or diagnose fleet connectivity.',
    'set -euo pipefail',
    '',
    'NAME=' + harnessName,
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
    `      -d "# Bottle: fleet-register-${harnessName}\n\n$(date -u +%Y-%m-%dT%H:%M:%SZ): $NAME registering with fleet"`,
    '    echo ""',
    '    echo "[fleet] Registered."',
    '    ;;',
    '',
    '  ping)',
    '    echo "[fleet] Ping from $NAME at $(date -u +%Y-%m-%dT%H:%M:%SZ)"',
    '    curl -s -o /dev/null -w "%{http_code}" "$HARBOR/bottle" \\',
    '      -X POST -H "Content-Type: text/markdown" \\',
    `      -d "# Bottle: fleet-ping-${harnessName}\n\nheartbeat $(date -u +%s)" \\`,
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

// ---------------------------------------------------------------------------
// GC_SELF_AUDIT_TEMPLATE — GC self-audit shell script
// ---------------------------------------------------------------------------
export function GC_SELF_AUDIT_TEMPLATE(harnessName: string): string {
  return [
    '#!/usr/bin/env bash',
    `# gc-self-audit.sh for ${harnessName}`,
    '# Reports disk/RAM/load to fleet GC ledger.',
    'set -euo pipefail',
    '',
    'NAME=' + harnessName,
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
    `# Bottle: gc-audit-${harnessName} — \${TIMESTAMP}`,
    '',
    '- **instance**: ' + harnessName,
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

// ---------------------------------------------------------------------------
// SESSION_STATE_TEMPLATE — Cold-start bootstrap file
// ---------------------------------------------------------------------------
export function SESSION_STATE_TEMPLATE(harnessName: string): string {
  return `# SESSION-STATE for ${harnessName}\n\n_Last boot: pending_\n\n`;
}

// ---------------------------------------------------------------------------
// Convenience: generate all fleet files at once
// ---------------------------------------------------------------------------
export function generateFleetFiles(harnessName: string): Record<string, string> {
  return {
    'AGENTS.md': AGENTS_TEMPLATE(harnessName),
    'FLEET_PROTOCOL.md': FLEET_PROTOCOL_TEMPLATE(harnessName),
    '.gcconfig': GCCONFIG_TEMPLATE(harnessName),
    'scripts/fleet-scout.sh': FLEET_SCOUT_TEMPLATE(harnessName),
    'scripts/gc-self-audit.sh': GC_SELF_AUDIT_TEMPLATE(harnessName),
    'i2i-vessel/SESSION-STATE.md': SESSION_STATE_TEMPLATE(harnessName),
  };
}

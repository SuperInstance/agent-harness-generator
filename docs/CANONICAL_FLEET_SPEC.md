# Fleet Canonical Spec — SuperInstance Fleet Protocol v2

*Source: Kimi Code analysis of 10+ SuperInstance repos (baton-system, construct, construct-coordination, agent-harness-generator)*

## 1. Harbor Protocol (I2I Transport)

### Architecture
Harbor is the I2I message bus — a daemon that accepts bottles and makes them available to all fleet members.

### Endpoints

**POST /bottle** — Write a bottle
```
POST http://localhost:8797/bottle
Content-Type: text/markdown

# Bottle: <name> — <ISO-8601 timestamp>

<free-form markdown body>
```
- Response: `200 OK` on success
- TCP daemon at port 8796 accepts raw TCP connections with same protocol
- The bottle name should be URL-safe (alphanumeric + hyphens)

**GET /bottles** — List all bottles
```
GET http://localhost:8797/bottles
```
- Response: markdown list of bottles with timestamps

**GET /bottle/<name>** — Read a specific bottle
```
GET http://localhost:8797/bottle/my-bottle
```
- Response: the full bottle markdown content

### Bottle Format
```markdown
# Bottle: <name> — <timestamp>

- **field1**: value1
- **field2**: value2

Free-form body below...
```

Key fields when used for structured data:
- `instance`: the harness/agent name
- `timestamp`: ISO-8601 UTC
- `type`: bottle type (fleet-status, gc-report, pulse, heartbeat, etc.)

## 2. I2I Vessel Protocol

The vessel is a local filesystem mirror of the fleet state:

```
i2i-vessel/
├── bottles/                    # Outgoing + cached bottles
│   ├── 2026-06-15-state.bottle.md
│   └── fleet-register.bottle.md
├── TASK/                       # Incoming work items
│   ├── 001-analyze-data.task.md
│   └── 002-generate-report.task.md
└── SESSION-STATE.md            # Cold-start bootstrap
```

**SESSION-STATE.md** — Contains the last known state so any entering agent can bootstrap:
```markdown
# SESSION-STATE

_Last boot: 2026-06-15T12:00:00Z_
_Instance: my-harness_

## Last Known State
- Last bottles written: [...]
- Fleet status: active
- GC metrics: ...
```

## 3. GC Protocol (gc-intelligent)

### Ledger Format
Ledger at `data/gc-ledger/ledger.jsonl`:
```jsonl
{"action":"evict","timestamp":"2026-06-15T12:00:00Z","size_kb":1024,"reason":"compost_ttl_expired","tier":"cold","freed_kb":1024}
{"action":"fleet-kit-report","timestamp":"2026-06-15T12:05:00Z","instance":"my-harness","disk_pct":63,"disk_free_kb":12345678,"mem_pct":45,"load":0.5}
```

### GC Bottle Format
```markdown
# Bottle: gc-audit-<instance-name> — <timestamp>

- **instance**: my-harness
- **timestamp**: 2026-06-15T12:00:00Z
- **disk_pct**: 63
- **disk_free_kb**: 12345678
- **mem_pct**: 45
- **load**: 0.5
- **pwd**: /path/to/harness
```

### .gcconfig Schema (TOML)
```toml
[gc]
tier = "hot"              # hot | warm | cold
setpoint = 20             # Target free space %
aggression_min = 0.5
aggression_max = 5.0
compost_ttl_hours = 72

[paths]
immortal = ["AGENTS.md", "FLEET_PROTOCOL.md", ".gcconfig"]
protected = ["node_modules/", "dist/"]
evictable = ["logs/", "tmp/"]
```

## 4. Conservation Meter / Pulse Protocol

### UDP Format (primary)
Port **8798**, UDP datagram containing one JSON line:
```json
{"timestamp":"2026-06-15T12:00:00Z","diskPct":63,"memPct":45,"load1m":0.5,"c":1134,"eta":380,"ratio":2.98}
```

### γ (Complexity) Calculation
```
γ = disk% × 10 + load × 100
```

### η (Efficiency) Calculation
```
η = active_services × 10
```

### C (Total Cost)
```
C = γ + η
```

### Ratio (Health)
```
ratio = γ / η
```
Healthy: < 5 | Warning: 5-10 | Critical: > 10

## 5. A2A Subagent Protocol

### Spawn (OpenClaw Gateway)
```
POST http://localhost:18789/api/sessions/spawn
Content-Type: application/json

{
  "task": "Analyze the colony data",
  "model": "deepseek/deepseek-v4-flash",
  "label": "analysis-agent",
  "mode": "run",
  "timeoutSeconds": 300
}
```
Response:
```json
{
  "sessionKey": "agent:main:subagent:<uuid>",
  "childSessionKey": "agent:main:subagent:<uuid>",
  "mode": "run"
}
```

### Send Message
```
POST http://localhost:18789/api/sessions/send
Content-Type: application/json

{
  "sessionKey": "agent:main:subagent:<uuid>",
  "message": "Continue with step 2"
}
```

## 6. Fleet Registration Protocol

### Registration Bottle
```markdown
# Bottle: fleet-register-<name> — <timestamp>

- **name**: my-harness
- **version**: 1.0.0
- **tier**: hot
- **host**: oracle2
- **capabilities**: ["a2a", "i2i", "gc", "pulse"]
```

### Heartbeat Bottle
```markdown
# Bottle: fleet-ping-<name>

heartbeat <unix-epoch-ms>
```

### Deregistration Bottle
```markdown
# Bottle: fleet-deregister-<name> — <timestamp>

Instance <name> leaving fleet.
```

## 7. Fleet Communication & Tier Structure

### Tier Hierarchy (from baton-system)
- **hot**: Active, high-churn repos (agent-harness-generator, pincher, fleet-oracle2)
- **warm**: Stable repos with periodic activity (plato-dojo, constr...t-theory-core)
- **cold**: Archive repos, infrequent access (pincher-legacy-mine, sunset-ecosystem)

### Communication Channels
1. **Bottles (primary)**: Harbor daemon at port 8796/8797
2. **Conservation Meter (metrics)**: UDP port 8798
3. **Rotation Feed (alerts)**: UDP port 8799
4. **Construct-Coordination (status)**: GitHub repo at SuperInstance/construct-coordination
5. **Baton-System (canonical)**: GitHub repo at SuperInstance/baton-system

### Fleet Status Convention
Status reports go in `construct-coordination/notes/{instance-name}/fleet-status-YYYY-MM-DD.md`

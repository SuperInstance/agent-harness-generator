// SPDX-License-Identifier: MIT
//
// The pickable catalog: hosts, templates, and the reusable agents / skills /
// commands a harness author can compose. Content mirrors the templates and the
// .claude-plugin skills already shipped in this repo so the UI stays faithful
// to what the CLI scaffolds.

import type { CatalogItem, HostInfo, TemplateInfo } from './types';

export const HOSTS: HostInfo[] = [
  { id: 'claude-code', name: 'Claude Code', shape: 'MCP + 5-handler hooks + 3-scope settings', color: '#D97757' },
  { id: 'codex', name: 'OpenAI Codex', shape: 'MCP via ~/.codex/config.toml tables', color: '#412991' },
  { id: 'pi-dev', name: 'pi.dev', shape: 'Pi extension — pi.registerTool() (no MCP)', color: '#8b5cf6' },
  { id: 'hermes', name: 'Hermes Agent', shape: 'MCP runtime + <think> scrubbing', color: '#06b6d4' },
  { id: 'openclaw', name: 'OpenClaw', shape: 'MCP via ~/.openclaw/openclaw.json + skills', color: '#ef4444' },
  { id: 'rvm', name: 'RVM', shape: 'Bare-metal microhypervisor + witness', color: '#64748b' },
];

export const TEMPLATES: TemplateInfo[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Kernel + one host adapter + an init entry point. The smallest publishable harness.',
    defaultAgents: [],
    defaultSkills: ['create-harness'],
    defaultCommands: ['doctor'],
  },
  {
    id: 'vertical-devops',
    name: 'Vertical · DevOps / SRE',
    description: 'Incident response harness — responder, escalator, postmortem, runbook-runner agents.',
    defaultAgents: ['responder', 'escalator', 'postmortem', 'runbook-runner'],
    defaultSkills: ['create-harness', 'validate-harness'],
    defaultCommands: ['doctor', 'route'],
  },
  {
    id: 'vertical-trading',
    name: 'Vertical · Trading',
    description: 'Market-analysis harness — signal, risk, and execution agents over a shared memory.',
    defaultAgents: ['signal', 'risk', 'execution'],
    defaultSkills: ['create-harness'],
    defaultCommands: ['doctor', 'memory-search'],
  },
  {
    id: 'vertical-support',
    name: 'Vertical · Support',
    description: 'Customer-support harness — triage, responder, and knowledge-base retrieval agents.',
    defaultAgents: ['triage', 'responder', 'kb-retriever'],
    defaultSkills: ['create-harness'],
    defaultCommands: ['doctor'],
  },
];

// ---------------------------------------------------------------------------
// Agents — emitted as src/agents/<id>.ts plus an agent markdown card.
// ---------------------------------------------------------------------------

export const AGENTS: CatalogItem[] = [
  {
    id: 'responder',
    name: 'Responder',
    description: 'First-line incident responder. Triages an alert and proposes a mitigation.',
    tags: ['devops'],
    body: 'You are the first-line incident responder. When an alert fires:\n\n1. Classify severity (SEV1–SEV4) from the signal payload.\n2. Pull the matching runbook from memory (`memory search`).\n3. Propose the smallest safe mitigation; never auto-apply destructive steps.\n4. Hand off to the escalator if severity >= SEV2 or no runbook matches.',
  },
  {
    id: 'escalator',
    name: 'Escalator',
    description: 'Pages the right humans and opens the incident bridge when severity warrants.',
    tags: ['devops'],
    body: 'You decide when and whom to page. Given a classified incident:\n\n1. Map service → on-call rotation.\n2. Open an incident channel and post the responder summary.\n3. Page progressively (primary → secondary → manager) on ack timeout.\n4. Record every escalation decision to memory for the postmortem.',
  },
  {
    id: 'postmortem',
    name: 'Postmortem',
    description: 'Drafts a blameless postmortem from the incident timeline in memory.',
    tags: ['devops'],
    body: 'You write blameless postmortems. After an incident resolves:\n\n1. Reconstruct the timeline from memory entries.\n2. Identify contributing factors, not a single root cause.\n3. Produce concrete, owned, dated action items.\n4. Keep tone factual; never attribute fault to individuals.',
  },
  {
    id: 'runbook-runner',
    name: 'Runbook Runner',
    description: 'Executes a named runbook step-by-step with confirmation gates.',
    tags: ['devops'],
    body: 'You execute runbooks deterministically. Given a runbook id:\n\n1. Load the runbook from `runbooks/`.\n2. Execute steps in order, pausing at any step marked `confirm:`.\n3. Capture output of each step to memory.\n4. Abort and escalate on the first non-recoverable error.',
  },
  {
    id: 'signal',
    name: 'Signal',
    description: 'Generates trade signals from market features; emits confidence + rationale.',
    tags: ['trading'],
    body: 'You generate trade signals. For each evaluation window:\n\n1. Read the feature vector from shared memory.\n2. Emit a directional signal with a 0–1 confidence and a one-line rationale.\n3. Never size positions — that is the execution agent.\n4. Log every signal with its features for later attribution.',
  },
  {
    id: 'risk',
    name: 'Risk',
    description: 'Gates signals against exposure, drawdown, and per-symbol limits.',
    tags: ['trading'],
    body: 'You are the risk gate. Every proposed order passes through you:\n\n1. Check aggregate and per-symbol exposure limits.\n2. Veto orders that breach drawdown or concentration policy.\n3. Down-size rather than reject when a partial fits policy.\n4. Record every veto with the limit that triggered it.',
  },
  {
    id: 'execution',
    name: 'Execution',
    description: 'Sizes and routes approved orders; reports fills back to memory.',
    tags: ['trading'],
    body: 'You execute approved, risk-gated orders:\n\n1. Size the position from confidence × risk budget.\n2. Choose an order type appropriate to liquidity.\n3. Never place an order that has not passed the risk gate.\n4. Write fills and slippage back to memory for attribution.',
  },
  {
    id: 'triage',
    name: 'Triage',
    description: 'Routes inbound support tickets by intent, urgency, and product area.',
    tags: ['support'],
    body: 'You triage inbound support tickets:\n\n1. Classify intent, urgency, and product area.\n2. Deduplicate against open tickets in memory.\n3. Route to the responder with a suggested priority.\n4. Auto-close obvious spam with a logged reason.',
  },
  {
    id: 'kb-retriever',
    name: 'KB Retriever',
    description: 'Semantic search over the knowledge base; returns cited passages.',
    tags: ['support'],
    body: 'You retrieve knowledge-base answers:\n\n1. Embed the question and search the KB via HNSW.\n2. Return the top passages with source citations.\n3. Abstain (say "no confident match") rather than hallucinate.\n4. Log misses so the KB can be improved.',
  },
];

// ---------------------------------------------------------------------------
// Skills — emitted as .claude/skills/<id>/SKILL.md (Claude-ready) + plugin ref.
// ---------------------------------------------------------------------------

export const SKILLS: CatalogItem[] = [
  {
    id: 'create-harness',
    name: 'create-harness',
    description:
      'Scaffold your own focused AI agent harness — pick host, template, agents, and skills, and ship a npm-publishable harness with its own npx CLI.',
    tags: ['scaffolding'],
    body: 'This skill scaffolds an AI agent harness — your own focused, branded harness with its own `npx <name>` CLI, MCP server registration, memory namespace, learning loop, and marketplace identity.\n\n## When to use this skill\n\nUse this skill when the user wants a custom MCP-server-backed AI assistant, a Claude Code plugin that bundles their own agents/skills/prompts, or a standalone npm package they can publish.\n\n## How to invoke\n\n```\n/create-harness\n```\n\nThe skill asks for: harness name (kebab-case), description, host(s), template, memory backend, routing strategy, and marketplace mode.',
  },
  {
    id: 'validate-harness',
    name: 'validate-harness',
    description:
      'Release-readiness umbrella for a scaffolded harness: doctor + verify + path-guard + mcp + secrets checks in one pass.',
    tags: ['quality'],
    body: 'Run the full release-readiness check on a scaffolded harness.\n\n## What it checks\n\n- `doctor` — install health\n- `verify` — witness manifest integrity (Ed25519)\n- path-guard — no escapes outside the harness root\n- mcp — the MCP server registers and lists tools\n- secrets — required secrets resolve (GCP Secret Manager aware)\n\n## How to invoke\n\n```\n/validate-harness <path>\n```',
  },
  {
    id: 'publish-harness',
    name: 'publish-harness',
    description: 'Smoke-test + witness-sign + npm publish for a generated harness, in one gated flow.',
    tags: ['release'],
    body: 'Publish a generated harness to npm with provenance.\n\n## Flow\n\n1. Smoke test (kernel loads, MCP validates).\n2. Ed25519 witness-sign the release manifest.\n3. `npm publish --provenance` (SLSA L2) gated on a clean tree.\n\n## How to invoke\n\n```\n/publish-harness\n```',
  },
  {
    id: 'verify-witness',
    name: 'verify-witness',
    description: 'Verify the Ed25519 witness manifest of a scaffolded harness — tamper detection before install.',
    tags: ['security'],
    body: 'Verify the provenance of a scaffolded harness.\n\n## What it does\n\nRe-hashes the harness tree and checks the hash chain against the Ed25519 signature in `witness.json`. Fails loudly on any tamper.\n\n## How to invoke\n\n```\n/verify-witness <path>\n```',
  },
  {
    id: 'memory-inspect',
    name: 'memory-inspect',
    description: 'Inspect the harness memory namespace — search, list patterns, and show decay state.',
    tags: ['memory'],
    body: 'Inspect what the harness has learned.\n\n## Capabilities\n\n- `search <query>` — semantic search via HNSW\n- `list` — recent patterns with emergent-time decay weight\n- `forget <id>` — evict a pattern\n\n## How to invoke\n\n```\n/memory-inspect search "<query>"\n```',
  },
];

// ---------------------------------------------------------------------------
// Commands — emitted as .claude/commands/<id>.md (slash-command bodies).
// ---------------------------------------------------------------------------

export const COMMANDS: CatalogItem[] = [
  {
    id: 'doctor',
    name: 'doctor',
    description: 'Health-check the harness install: kernel load, MCP wiring, memory backend, host adapter.',
    tags: ['ops'],
    body: 'Run a full health check of this harness and report a PASS/FAIL table.\n\nCheck, in order:\n\n1. Kernel loads and `kernelInfo().version` matches package.json.\n2. The MCP server starts and lists its tools.\n3. The memory backend is reachable.\n4. The configured host adapter is present.\n\nPrint a compact table; exit non-zero if any check fails.',
  },
  {
    id: 'route',
    name: 'route',
    description: 'Show the routing-tier recommendation for a given task description.',
    tags: ['ops'],
    body: 'Given a task description, return the routing-tier recommendation and the reasoning.\n\n1. Classify the task by complexity and risk.\n2. Map it to a tier (fast / balanced / deep).\n3. Print the chosen tier and a one-line justification.',
  },
  {
    id: 'memory-search',
    name: 'memory-search',
    description: 'Semantic search across stored patterns in the harness memory namespace.',
    tags: ['memory'],
    body: 'Search the harness memory for patterns relevant to the query.\n\n1. Embed the query.\n2. Run HNSW nearest-neighbour search over the namespace.\n3. Return the top matches with their decay-weighted scores.',
  },
  {
    id: 'new-agent',
    name: 'new-agent',
    description: 'Scaffold a new agent file in src/agents/ with the harness conventions.',
    tags: ['scaffolding'],
    body: 'Create a new agent for this harness.\n\n1. Ask for the agent name and one-line role.\n2. Write `src/agents/<name>.ts` following the existing agents.\n3. Register it in the agent index.\n4. Add a short card to the README agent table.',
  },
];

export const CATALOG_BY_KIND = {
  agent: AGENTS,
  skill: SKILLS,
  command: COMMANDS,
} as const;

export function findItem(kind: 'agent' | 'skill' | 'command', id: string): CatalogItem | undefined {
  return CATALOG_BY_KIND[kind].find((i) => i.id === id);
}

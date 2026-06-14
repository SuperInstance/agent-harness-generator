// SPDX-License-Identifier: MIT
//
// Shared types for the browser-side harness generator. Mirrors the data model
// of packages/create-agent-harness so the UI emits artifacts that the CLI and
// the Claude marketplace would accept verbatim.

export type HostId = 'claude-code' | 'codex' | 'pi-dev' | 'hermes' | 'openclaw' | 'rvm';

export type TemplateId = 'minimal' | 'vertical-devops' | 'vertical-trading' | 'vertical-support';

export type MemoryBackend = 'agentdb' | 'sqlite' | 'in-memory';

export type RoutingStrategy = '3-tier' | 'single-tier';

export type MarketplaceMode = 'powered-by' | 'independent';

/** A single file in a generated artifact tree. Path is POSIX, relative to root. */
export interface GenFile {
  path: string;
  content: string;
}

/** A catalog entry the user can toggle on/off (agent / skill / command). */
export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  /** Long-form body used when rendering the markdown artifact. */
  body: string;
  /** Optional tags for filtering / display. */
  tags?: string[];
}

export interface HostInfo {
  id: HostId;
  name: string;
  /** Short integration shape, e.g. "MCP + hooks + settings". */
  shape: string;
  color: string;
}

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
  /** Catalog ids pre-selected when this template is chosen. */
  defaultAgents: string[];
  defaultSkills: string[];
  defaultCommands: string[];
}

/** The full user-facing configuration captured by the form. */
export interface HarnessConfig {
  name: string;
  description: string;
  hosts: HostId[];
  template: TemplateId;
  memory: MemoryBackend;
  routing: RoutingStrategy;
  marketplace: MarketplaceMode;
  agents: string[];
  skills: string[];
  commands: string[];
}

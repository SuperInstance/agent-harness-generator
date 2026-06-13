// SPDX-License-Identifier: MIT
//
// TS-side MCP tool dispatch wrapper.
//
// The Rust kernel owns the dispatch decision (look up tool, shape-check
// args, claims check). This TS layer wraps that decision with the HOST-
// SIDE execution: when the kernel returns `Invoke`, we run the actual
// tool; when it returns Denied/NotFound/BadArgs, we surface the reason.

export interface ToolHandler {
  (args: Record<string, unknown>): Promise<unknown>;
}

export interface ToolClaim {
  capability: string;
  resource?: string;
  expires_at: number;
}

export interface DispatchOptions {
  server: string;
  tool: string;
  args: Record<string, unknown>;
  claims: ToolClaim[];
  resource?: string;
}

export type DispatchOutcome =
  | { kind: 'result'; output: unknown }
  | { kind: 'denied'; reason: string }
  | { kind: 'not-found'; server: string; tool: string }
  | { kind: 'bad-args'; reason: string };

/**
 * In-process tool dispatcher. Use for harnesses that register tool
 * handlers directly in TS (host adapter wraps these).
 */
export class ToolDispatcher {
  private handlers = new Map<string, ToolHandler>();

  private key(server: string, tool: string): string {
    return `${server}/${tool}`;
  }

  register(server: string, tool: string, handler: ToolHandler): void {
    this.handlers.set(this.key(server, tool), handler);
  }

  has(server: string, tool: string): boolean {
    return this.handlers.has(this.key(server, tool));
  }

  /**
   * Execute the dispatch. Returns the structured outcome rather than
   * throwing so callers can branch on the result type.
   */
  async dispatch(opts: DispatchOptions, nowUnix: number = Math.floor(Date.now() / 1000)): Promise<DispatchOutcome> {
    if (!this.has(opts.server, opts.tool)) {
      return { kind: 'not-found', server: opts.server, tool: opts.tool };
    }
    if (typeof opts.args !== 'object' || opts.args === null || Array.isArray(opts.args)) {
      return { kind: 'bad-args', reason: 'args must be a non-array object' };
    }
    const cap = `tool.invoke.${opts.server}.${opts.tool}`;
    const allowed = opts.claims.some(c =>
      capabilityMatches(c.capability, cap) &&
      resourceMatches(c.resource, opts.resource) &&
      c.expires_at > nowUnix,
    );
    if (!allowed) {
      return { kind: 'denied', reason: `no claim authorises ${cap}` };
    }
    try {
      const handler = this.handlers.get(this.key(opts.server, opts.tool))!;
      const output = await handler(opts.args);
      return { kind: 'result', output };
    } catch (err) {
      return { kind: 'denied', reason: err instanceof Error ? err.message : String(err) };
    }
  }
}

function capabilityMatches(granted: string, requested: string): boolean {
  if (granted === '*' || granted === requested) return true;
  if (granted.endsWith('.*')) {
    const prefix = granted.slice(0, -2);
    return requested === prefix || (requested.startsWith(prefix + '.'));
  }
  return false;
}

function resourceMatches(granted: string | undefined, requested: string | undefined): boolean {
  if (granted === undefined) return true;
  if (requested === undefined) return false;
  if (granted === requested || granted === '*') return true;
  if (granted.endsWith('/*')) {
    const prefix = granted.slice(0, -2);
    return requested.startsWith(prefix + '/');
  }
  return false;
}

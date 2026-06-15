// SPDX-License-Identifier: MIT
//
// @superinstance/fleet-kit — A2A (Agent-to-Agent) protocol client.
//
// Agents spawned by the harness communicate via OpenClaw's subagent API.
// This module provides a type-safe wrapper around sessions_spawn / sessions_send.

export interface A2ASubagentSpec {
  task: string;
  model?: string;
  label?: string;
  mode?: 'run' | 'interactive';
  timeoutSeconds?: number;
}

export interface A2ASubagentResult {
  sessionKey: string;
  status: 'completed' | 'failed' | 'timed_out';
  error?: string;
}

export interface A2AClientOptions {
  gatewayUrl?: string;
  gatewayToken?: string;
  defaultModel?: string;
}

/**
 * A2A Client — spawn and communicate with subagents.
 *
 * Uses OpenClaw gateway's sessions API (sessions_spawn/sessions_send).
 * Falls back to direct HTTP to the gateway if not running inside OpenClaw.
 */
export class A2AClient {
  private gatewayUrl: string;
  private gatewayToken?: string;
  private defaultModel?: string;

  constructor(options: A2AClientOptions = {}) {
    this.gatewayUrl = options.gatewayUrl ?? 'http://localhost:18789';
    this.gatewayToken = options.gatewayToken;
    this.defaultModel = options.defaultModel;
  }

  /**
   * Spawn a subagent to complete a task.
   * Returns once the subagent finishes or times out.
   */
  async spawn(spec: A2ASubagentSpec): Promise<A2ASubagentResult> {
    // Try OpenClaw gateway API first
    try {
      const response = await fetch(`${this.gatewayUrl}/api/sessions/spawn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.gatewayToken ? { Authorization: `Bearer ${this.gatewayToken}` } : {}),
        },
        body: JSON.stringify({
          task: spec.task,
          model: spec.model ?? this.defaultModel,
          label: spec.label,
          mode: spec.mode === 'interactive' ? undefined : 'run',
          timeoutSeconds: spec.timeoutSeconds,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => 'unknown error');
        return { sessionKey: '', status: 'failed', error: `HTTP ${response.status}: ${errBody}` };
      }

      const result = await response.json();
      return {
        sessionKey: result.sessionKey ?? result.childSessionKey ?? '',
        status: 'completed',
      };
    } catch (err) {
      return {
        sessionKey: '',
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Send a message to a running subagent session.
   */
  async send(sessionKey: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/sessions/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.gatewayToken ? { Authorization: `Bearer ${this.gatewayToken}` } : {}),
        },
        body: JSON.stringify({
          sessionKey,
          message,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

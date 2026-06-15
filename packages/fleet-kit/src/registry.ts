// SPDX-License-Identifier: MIT
//
// @superinstance/fleet-kit — Fleet Registry client.
//
// Register, unregister, and query the fleet registry (via construct-coordination
// repo or harbor-daemon bottles).

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface FleetRegistration {
  name: string;
  version: string;
  tier: 'hot' | 'warm' | 'cold';
  status: 'active' | 'idle' | 'offline';
  host: string;
  port?: number;
  lastHeartbeat: string;
  capabilities: string[];
}

export interface RegistryClientOptions {
  harborUrl?: string;
  registryPath?: string;
}

/**
 * Fleet Registry Client — register and discover fleet members.
 */
export class FleetRegistry {
  private harborUrl: string;
  private registryPath: string;

  constructor(options: RegistryClientOptions = {}) {
    this.harborUrl = options.harborUrl ?? 'http://localhost:8797';
    this.registryPath = options.registryPath ?? path.join(process.cwd(), 'fleet-registry.json');
  }

  /**
   * Register this harness with the fleet.
   */
  async register(spec: Omit<FleetRegistration, 'lastHeartbeat' | 'status'>): Promise<boolean> {
    const registration: FleetRegistration = {
      ...spec,
      status: 'active',
      lastHeartbeat: new Date().toISOString(),
    };

    // Write to harbor
    const bottleContent = [
      `# Bottle: fleet-register-${spec.name} — ${registration.lastHeartbeat}`,
      '',
      ...Object.entries(registration).map(([k, v]) => `- **${k}**: ${JSON.stringify(v)}`),
      '',
    ].join('\n');

    try {
      const response = await fetch(`${this.harborUrl}/bottle`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/markdown' },
        body: bottleContent,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch {
      // Write locally
    }

    // Also store locally
    try {
      fs.writeFileSync(this.registryPath, JSON.stringify(registration, null, 2), 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send a heartbeat to the fleet.
   */
  async heartbeat(name: string): Promise<boolean> {
    const timestamp = new Date().toISOString();
    const content = `# Bottle: fleet-ping-${name}\n\nheartbeat ${Date.now()}\n`;

    try {
      const response = await fetch(`${this.harborUrl}/bottle`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/markdown' },
        body: content,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Deregister from the fleet.
   */
  async deregister(name: string): Promise<boolean> {
    const timestamp = new Date().toISOString();
    const content = `# Bottle: fleet-deregister-${name} — ${timestamp}\n\nInstance ${name} leaving fleet.\n`;

    try {
      const response = await fetch(`${this.harborUrl}/bottle`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/markdown' },
        body: content,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

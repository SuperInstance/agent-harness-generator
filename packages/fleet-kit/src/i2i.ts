// SPDX-License-Identifier: MIT
//
// @superinstance/fleet-kit — I2I (Instance-to-Instance) protocol client.
//
// Communicates with harbor-daemon for shared state via bottles.
// Falls back to local filesystem if harbor is unreachable.

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface I2IClientOptions {
  harborUrl?: string;
  vesselPath?: string;
}

export interface Bottle {
  name: string;
  timestamp: string;
  content: string;
}

/**
 * I2I Client — read/write bottles to harbor or local vessel.
 *
 * Provides a uniform interface for shared state across instances.
 */
export class I2IClient {
  private harborUrl: string;
  private vesselPath: string;

  constructor(options: I2IClientOptions = {}) {
    this.harborUrl = options.harborUrl ?? 'http://localhost:8797';
    this.vesselPath = options.vesselPath ?? path.join(process.cwd(), 'i2i-vessel');
  }

  /**
   * Write a bottle to harbor (with fallback to local filesystem).
   */
  async writeBottle(name: string, content: string): Promise<boolean> {
    const timestamp = new Date().toISOString();
    const bottleContent = `# Bottle: ${name} — ${timestamp}\n\n${content}\n`;

    // Try harbor first
    try {
      const response = await fetch(`${this.harborUrl}/bottle`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/markdown' },
        body: bottleContent,
      });
      if (response.ok) return true;
    } catch {
      // Fall through to local filesystem
    }

    // Local fallback — write to i2i-vessel/bottles/
    try {
      const bottlesDir = path.join(this.vesselPath, 'bottles');
      fs.mkdirSync(bottlesDir, { recursive: true });
      const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filepath = path.join(bottlesDir, `${safeName}-${Date.now()}.bottle.md`);
      fs.writeFileSync(filepath, bottleContent, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read all bottles (from harbor or local).
   */
  async readBottles(): Promise<Bottle[]> {
    // Try harbor first
    try {
      const response = await fetch(`${this.harborUrl}/bottles`);
      if (response.ok) {
        const text = await response.text();
        return this.parseBottleList(text);
      }
    } catch {
      // Fall through
    }

    // Local fallback
    try {
      const bottlesDir = path.join(this.vesselPath, 'bottles');
      if (!fs.existsSync(bottlesDir)) return [];
      const files = fs.readdirSync(bottlesDir).filter(f => f.endsWith('.bottle.md'));
      return files.map(f => {
        const content = fs.readFileSync(path.join(bottlesDir, f), 'utf-8');
        const name = f.replace(/-\d+\.bottle\.md$/, '');
        const tsMatch = content.match(/— (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z?)/);
        return {
          name,
          timestamp: tsMatch?.[1] ?? '',
          content,
        };
      });
    } catch {
      return [];
    }
  }

  private parseBottleList(text: string): Bottle[] {
    // Harbor returns bottles as markdown list — parse accordingly
    const bottles: Bottle[] = [];
    const lines = text.split('\n');
    let current: Partial<Bottle> = {};
    for (const line of lines) {
      const nameMatch = line.match(/^# Bottle:\s+(.+?)\s*[—–-]/);
      if (nameMatch) {
        if (current.name) bottles.push(current as Bottle);
        current = { name: nameMatch[1].trim(), content: line + '\n' };
      } else if (current.name) {
        current.content = (current.content ?? '') + line + '\n';
      }
    }
    if (current.name) bottles.push(current as Bottle);
    return bottles;
  }

  /**
   * Read the SESSION-STATE.md file.
   */
  readSessionState(): string {
    try {
      const statePath = path.join(this.vesselPath, 'SESSION-STATE.md');
      return fs.existsSync(statePath) ? fs.readFileSync(statePath, 'utf-8') : '';
    } catch {
      return '';
    }
  }

  /**
   * Write the SESSION-STATE.md file.
   */
  writeSessionState(content: string): boolean {
    try {
      fs.mkdirSync(this.vesselPath, { recursive: true });
      fs.writeFileSync(path.join(this.vesselPath, 'SESSION-STATE.md'), content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }
}

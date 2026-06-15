// SPDX-License-Identifier: MIT
//
// @superinstance/fleet-kit — GC (Garbage Collection) reporter.
//
// Reports disk/RAM/load metrics to the fleet GC ledger. Mirrors the
// gc-intelligent.sh protocol for programmatic consumption.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface GCReport {
  timestamp: string;
  instance: string;
  diskPct: number;
  diskFreeKb: number;
  memPct: number;
  load: number;
  pwd: string;
}

export interface GCClientOptions {
  harborUrl?: string;
  instanceName?: string;
  ledgerPath?: string;
}

/**
 * GC Client — gather and report system metrics to the fleet GC ledger.
 */
export class GCClient {
  private harborUrl: string;
  private instanceName: string;
  private ledgerPath: string;

  constructor(options: GCClientOptions = {}) {
    this.harborUrl = options.harborUrl ?? 'http://localhost:8797';
    this.instanceName = options.instanceName ?? 'unknown-harness';
    this.ledgerPath = options.ledgerPath ?? path.join(process.cwd(), 'data', 'gc-ledger', 'ledger.jsonl');
  }

  /**
   * Gather current system metrics.
   */
  gatherMetrics(): GCReport {
    const { totalmem, freemem } = os;
    const memPct = Math.round((1 - freemem() / totalmem()) * 100);
    const load = os.loadavg()[0];

    // Disk — use fs.statfs or exec fallback
    let diskPct = 0;
    let diskFreeKb = 0;
    try {
      // Try reading /proc/mounts or use df via exec
      const { execSync } = require('node:child_process');
      const df = execSync('df / | tail -1', { encoding: 'utf-8' });
      const parts = df.trim().split(/\s+/);
      if (parts.length >= 4) {
        const used = parseInt(parts[2], 10);
        const avail = parseInt(parts[3], 10);
        diskFreeKb = avail;
        diskPct = Math.round((used / (used + avail)) * 100);
      }
    } catch {
      // Can't determine disk
    }

    return {
      timestamp: new Date().toISOString(),
      instance: this.instanceName,
      diskPct,
      diskFreeKb,
      memPct,
      load,
      pwd: process.cwd(),
    };
  }

  /**
   * Report metrics to the fleet GC ledger via harbor bottle.
   */
  async report(): Promise<boolean> {
    const metrics = this.gatherMetrics();

    const bottleContent = [
      `# Bottle: gc-audit-${this.instanceName} — ${metrics.timestamp}`,
      '',
      `- **instance**: ${metrics.instance}`,
      `- **timestamp**: ${metrics.timestamp}`,
      `- **disk_pct**: ${metrics.diskPct}`,
      `- **disk_free_kb**: ${metrics.diskFreeKb}`,
      `- **mem_pct**: ${metrics.memPct}`,
      `- **load**: ${metrics.load}`,
      `- **pwd**: ${metrics.pwd}`,
      '',
    ].join('\n');

    // Write to harbor
    try {
      const response = await fetch(`${this.harborUrl}/bottle`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/markdown' },
        body: bottleContent,
      });
      if (response.ok) {
        // Also append to local ledger
        this.appendLedger(metrics);
        return true;
      }
    } catch {
      // Harbor unreachable — write local only
    }

    return this.appendLedger(metrics);
  }

  /**
   * Append a metric entry to the local GC ledger.
   */
  private appendLedger(metrics: GCReport): boolean {
    try {
      fs.mkdirSync(path.dirname(this.ledgerPath), { recursive: true });
      const entry = JSON.stringify({
        action: 'fleet-kit-report',
        timestamp: metrics.timestamp,
        instance: this.instanceName,
        disk_pct: metrics.diskPct,
        disk_free_kb: metrics.diskFreeKb,
        mem_pct: metrics.memPct,
        load: metrics.load,
      }) + '\n';
      fs.appendFileSync(this.ledgerPath, entry, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }
}

// SPDX-License-Identifier: MIT
//
// @superinstance/fleet-kit — Pulse Metrics client.
//
// Push system conservation metrics to the conservation-meter (port 8798),
// mirroring the pulse-metric.sh protocol.

import * as os from 'node:os';
import * as dgram from 'node:dgram';

export interface PulseMetricsOptions {
  meterPort?: number;
  meterHost?: string;
  instanceName?: string;
}

export interface PulseSnapshot {
  timestamp: string;
  instance: string;
  diskPct: number;
  memPct: number;
  load1m: number;
  load5m: number;
  load15m: number;
  uptimeSeconds: number;
  c: number;     // γ (complexity) = disk%×10 + load×100
  eta: number;   // η (efficiency)
  ratio: number; // γ/η, healthy < 5
}

/**
 * Pulse Metrics Client — push conservation metrics to the fleet.
 *
 * Works with the conservation-meter service at port 8798 (UDP).
 * The conservation-meter aggregates these into the rotation-feed pipeline.
 */
export class PulseClient {
  private meterPort: number;
  private meterHost: string;
  private instanceName: string;
  private services: number;

  constructor(options: PulseMetricsOptions = {}) {
    this.meterPort = options.meterPort ?? 8798;
    this.meterHost = options.meterHost ?? '127.0.0.1';
    this.instanceName = options.instanceName ?? 'unknown-harness';
    this.services = 0;
  }

  /**
   * Set the number of active services for η calculation.
   */
  setServiceCount(count: number): void {
    this.services = count;
  }

  /**
   * Take a pulse snapshot of current metrics.
   */
  snapshot(): PulseSnapshot {
    const diskPct = this.readDiskPct();
    const memPct = Math.round((1 - os.freemem() / os.totalmem()) * 100);
    const [load1m, load5m, load15m] = os.loadavg();
    const uptimeSeconds = os.uptime();

    // γ (complexity) = disk%×10 + load×100
    const c = diskPct * 10 + load1m * 100;
    // η (efficiency) = active services × 10
    const eta = this.services * 10;
    // Ratio — healthy < 5
    const ratio = Math.round((c / Math.max(eta, 1)) * 100) / 100;

    return {
      timestamp: new Date().toISOString(),
      instance: this.instanceName,
      diskPct,
      memPct,
      load1m,
      load5m,
      load15m,
      uptimeSeconds,
      c,
      eta,
      ratio,
    };
  }

  /**
   * Push a pulse metric to the conservation-meter.
   */
  async push(): Promise<boolean> {
    const snap = this.snapshot();
    const payload = JSON.stringify(snap) + '\n';

    // Try UDP
    try {
      const socket = dgram.createSocket('udp4');
      return new Promise<boolean>((resolve) => {
        socket.send(payload, 0, Buffer.byteLength(payload), this.meterPort, this.meterHost, (err) => {
          socket.close();
          resolve(!err);
        });
      });
    } catch {
      // UDP failed — try TCP fallback
    }

    // TCP fallback
    try {
      const response = await fetch(`http://${this.meterHost}:${this.meterPort}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Read disk usage percentage.
   */
  private readDiskPct(): number {
    try {
      const { execSync } = require('node:child_process');
      const out = execSync('df / | tail -1', { encoding: 'utf-8' });
      const parts = out.trim().split(/\s+/);
      const pct = parseInt(parts[4]?.replace('%', '') ?? '0', 10);
      return isNaN(pct) ? 0 : pct;
    } catch {
      return 0;
    }
  }
}

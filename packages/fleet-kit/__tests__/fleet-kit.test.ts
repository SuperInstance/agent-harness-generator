// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import { A2AClient, I2IClient, GCClient, FleetRegistry, PulseClient, VERSION } from '../src/index.js';

describe('@superinstance/fleet-kit — exports', () => {
  it('exports VERSION', () => {
    expect(VERSION).toBe('0.1.0');
  });

  it('exports A2AClient', () => {
    const client = new A2AClient();
    expect(client).toBeInstanceOf(A2AClient);
    expect(typeof client.spawn).toBe('function');
    expect(typeof client.send).toBe('function');
  });

  it('exports I2IClient', () => {
    const client = new I2IClient();
    expect(client).toBeInstanceOf(I2IClient);
    expect(typeof client.writeBottle).toBe('function');
    expect(typeof client.readBottles).toBe('function');
    expect(typeof client.readSessionState).toBe('function');
    expect(typeof client.writeSessionState).toBe('function');
  });

  it('exports GCClient', () => {
    const client = new GCClient({ instanceName: 'test' });
    expect(client).toBeInstanceOf(GCClient);
    expect(typeof client.gatherMetrics).toBe('function');
    expect(typeof client.report).toBe('function');
  });

  it('exports FleetRegistry', () => {
    const registry = new FleetRegistry();
    expect(registry).toBeInstanceOf(FleetRegistry);
    expect(typeof registry.register).toBe('function');
    expect(typeof registry.heartbeat).toBe('function');
    expect(typeof registry.deregister).toBe('function');
  });

  it('exports PulseClient', () => {
    const client = new PulseClient({ instanceName: 'test' });
    expect(client).toBeInstanceOf(PulseClient);
    expect(typeof client.snapshot).toBe('function');
    expect(typeof client.push).toBe('function');
    expect(typeof client.setServiceCount).toBe('function');
  });
});

describe('A2AClient', () => {
  it('spawn returns failed when gateway is unreachable', async () => {
    const client = new A2AClient({ gatewayUrl: 'http://localhost:1' });
    const result = await client.spawn({ task: 'test' });
    expect(result.status).toBe('failed');
  });
});

describe('I2IClient', () => {
  it('writeBottle returns false when harbor unreachable and no vessel path', async () => {
    const client = new I2IClient({ harborUrl: 'http://localhost:1' });
    // If both harbor and local filesystem fail, returns false
    const result = await client.writeBottle('test', 'content');
    expect(typeof result).toBe('boolean');
  });

  it('readSessionState returns empty string when no vessel', () => {
    const client = new I2IClient({ vesselPath: '/tmp/nonexistent-vessel-test-xyz' });
    expect(client.readSessionState()).toBe('');
  });
});

describe('PulseClient', () => {
  it('snapshot returns valid metrics shape', () => {
    const client = new PulseClient({ instanceName: 'test-harness' });
    const snap = client.snapshot();
    expect(snap.instance).toBe('test-harness');
    expect(typeof snap.diskPct).toBe('number');
    expect(typeof snap.memPct).toBe('number');
    expect(typeof snap.load1m).toBe('number');
    expect(typeof snap.c).toBe('number');
    expect(typeof snap.ratio).toBe('number');
  });
});

describe('GCClient', () => {
  it('gatherMetrics returns valid shape', () => {
    const client = new GCClient({ instanceName: 'test' });
    const metrics = client.gatherMetrics();
    expect(metrics.instance).toBe('test');
    expect(metrics.timestamp).toBeTruthy();
    expect(typeof metrics.diskPct).toBe('number');
    expect(typeof metrics.memPct).toBe('number');
  });
});

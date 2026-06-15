// SPDX-License-Identifier: MIT
//
// @superinstance/fleet-kit — Main entry point.
//
// Re-exports all fleet protocol clients from a single import.

export { A2AClient } from './a2a.js';
export type { A2ASubagentSpec, A2ASubagentResult, A2AClientOptions } from './a2a.js';

export { I2IClient } from './i2i.js';
export type { I2IClientOptions, Bottle } from './i2i.js';

export { GCClient } from './gc.js';
export type { GCReport, GCClientOptions } from './gc.js';

export { FleetRegistry } from './registry.js';
export type { FleetRegistration, RegistryClientOptions } from './registry.js';

export { PulseClient } from './pulse.js';
export type { PulseMetricsOptions, PulseSnapshot } from './pulse.js';

/**
 * Fleet Kit version.
 */
export const VERSION = '0.1.0';

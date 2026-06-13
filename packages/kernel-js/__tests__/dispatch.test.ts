// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import { ToolDispatcher, type ToolClaim } from '../src/dispatch.js';

const NOW = 1_700_000_000;
const cap = (capability: string, resource?: string): ToolClaim => ({
  capability, resource, expires_at: NOW + 86400,
});

describe('ToolDispatcher', () => {
  it('register + dispatch invokes the handler with args', async () => {
    const d = new ToolDispatcher();
    d.register('memory', 'store', async (args) => ({ stored: args }));
    const r = await d.dispatch({
      server: 'memory', tool: 'store', args: { key: 'x' },
      claims: [cap('*')],
    }, NOW);
    expect(r.kind).toBe('result');
    if (r.kind === 'result') expect(r.output).toEqual({ stored: { key: 'x' } });
  });

  it('returns not-found for unregistered tool', async () => {
    const d = new ToolDispatcher();
    const r = await d.dispatch({
      server: 'x', tool: 'y', args: {}, claims: [cap('*')],
    }, NOW);
    expect(r.kind).toBe('not-found');
  });

  it('rejects non-object args', async () => {
    const d = new ToolDispatcher();
    d.register('s', 't', async () => 1);
    const r = await d.dispatch({
      server: 's', tool: 't',
      args: [] as unknown as Record<string, unknown>,
      claims: [cap('*')],
    }, NOW);
    expect(r.kind).toBe('bad-args');
  });

  it('denies when no claim authorises', async () => {
    const d = new ToolDispatcher();
    d.register('memory', 'store', async () => 1);
    const r = await d.dispatch({
      server: 'memory', tool: 'store', args: {}, claims: [],
    }, NOW);
    expect(r.kind).toBe('denied');
  });

  it('denies when claim expired', async () => {
    const d = new ToolDispatcher();
    d.register('memory', 'store', async () => 1);
    const r = await d.dispatch({
      server: 'memory', tool: 'store', args: {},
      claims: [{ capability: '*', expires_at: NOW - 1 }],
    }, NOW);
    expect(r.kind).toBe('denied');
  });

  it('honors wildcard suffix capability (tool.invoke.* matches tool.invoke.memory.store)', async () => {
    const d = new ToolDispatcher();
    d.register('memory', 'store', async () => 'ok');
    const r = await d.dispatch({
      server: 'memory', tool: 'store', args: {},
      claims: [cap('tool.invoke.*')],
    }, NOW);
    expect(r.kind).toBe('result');
  });

  it('respects resource scope', async () => {
    const d = new ToolDispatcher();
    d.register('memory', 'store', async () => 'ok');
    const allowed = await d.dispatch({
      server: 'memory', tool: 'store', args: {},
      resource: 'agents/coder',
      claims: [cap('*', 'agents/*')],
    }, NOW);
    expect(allowed.kind).toBe('result');
    const denied = await d.dispatch({
      server: 'memory', tool: 'store', args: {},
      resource: 'skills/x',
      claims: [cap('*', 'agents/*')],
    }, NOW);
    expect(denied.kind).toBe('denied');
  });

  it('surfaces handler exception as denied with the message', async () => {
    const d = new ToolDispatcher();
    d.register('s', 't', async () => { throw new Error('boom'); });
    const r = await d.dispatch({
      server: 's', tool: 't', args: {}, claims: [cap('*')],
    }, NOW);
    expect(r.kind).toBe('denied');
    if (r.kind === 'denied') expect(r.reason).toBe('boom');
  });
});

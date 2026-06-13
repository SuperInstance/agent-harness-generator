# Federation example

Shows two harness instances coordinating via the federation transport.

## Scenario

You have two instances of the same harness running on different machines (or in different processes). They share a tool registry and a memory namespace.

```bash
# On host A:
cd ops-bot/
harness federate init host-A
harness federate add host-B host-B ws://host-b.internal:9000 trusted

# On host B:
cd ops-bot/
harness federate init host-B
harness federate add host-A host-A ws://host-a.internal:9000 trusted
```

Now either side can `harness federate list` to see the peer.

## Trust tiers

| Tier | Effect |
|---|---|
| `self` | Local instance, no claim required |
| `trusted` | Read-only ops (memory.read, tool.list, etc.) skip the claims check |
| `untrusted` | EVERY message requires a claim (default for new peers) |

## Security model

Every inbound message goes through the kernel's `admit_message()`:

1. If the sender is `self`, admit.
2. If the sender is `trusted` AND the capability is read-only (ends in `.read`, `.list`, `.search`), admit.
3. Otherwise, the message MUST come with a claim allowing the capability/resource. The kernel verifies via `claims::check()`.
4. Expired claims are skipped.

No message is admitted "by default."

## Wire transport

The kernel only owns the envelope shape. Wire transport is host-side. Options:

| Transport | Best for |
|---|---|
| WebSocket | Browser / edge / cross-region |
| QUIC (via midstreamer) | Low-latency LAN |
| HTTP long-poll | Pi.dev (no MCP, no WS) |

Pick one in your harness's init code and feed received envelopes to the kernel's admit logic.

## What can't be federated yet

- Wasm-side message signing — kernel emits the envelope shape but signing requires the host transport to sign + the kernel to verify. Iter 10+ work.
- Cross-trust-domain claims — if peer A is trusted but its CLAIMS-signing key isn't on peer B's trust list, the claim won't verify. Multi-issuer trust is iter 11+.

## License

MIT

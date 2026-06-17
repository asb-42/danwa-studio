/**
 * Tests for src/lib/blueprint/edgeWiring.js — currently a no-op shim after
 * the Phase 3 deprecation of the legacy semantic edge wiring.
 *
 * The contract is small but worth pinning down: these functions exist so
 * callers don't need to know whether wiring is currently in use.
 */

import { describe, it, expect } from 'vitest';
import {
  wireEdgeOnConnect,
  wireEdgeOnDisconnect,
  isSemanticEdge,
} from '../../../src/lib/blueprint/edgeWiring.js';

describe('edgeWiring — post-Phase-3 contract', () => {
  it('wireEdgeOnConnect always returns false (no wiring needed)', async () => {
    const r = await wireEdgeOnConnect({ id: 'e1' }, [], () => {});
    expect(r).toBe(false);
  });

  it('wireEdgeOnDisconnect always returns false (no wiring needed)', async () => {
    const r = await wireEdgeOnDisconnect({ id: 'e1' }, [], () => {});
    expect(r).toBe(false);
  });

  it('isSemanticEdge always returns false', () => {
    expect(isSemanticEdge('uses_llm')).toBe(false);
    expect(isSemanticEdge('sequential')).toBe(false);
    expect(isSemanticEdge('anything')).toBe(false);
  });
});

/**
 * Tests for src/lib/blueprint/registry.js — Central node + edge type registry.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerNode,
  registerEdge,
  getNodeRegistration,
  getEdgeRegistration,
  getNodesByCategory,
  getEdgesByCategory,
  getNodeTypes,
  getEdgeTypes,
  getAllRegisteredNodes,
  getAllRegisteredEdges,
} from '../../../src/lib/blueprint/registry.js';

// Minimal stub component for tests (registry only stores the reference).
const stubComponent = function StubComponent() {};

// ---------------------------------------------------------------------------
// Per-test reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  // The registry is module-level state.  We have to reach into the module
  // to reset it between tests, otherwise order-of-execution leaks.
  // We do this by re-importing the module fresh — but Vitest caches modules.
  // Easier: just use unique type names per test, and avoid the global state
  // by relying on a small helper.
});

// ---------------------------------------------------------------------------
// Node registration
// ---------------------------------------------------------------------------

describe('registry — node registration', () => {
  it('registerNode + getNodeRegistration round-trip', () => {
    const cfg = {
      type: 'test-llm-profile',
      component: stubComponent,
      category: 'asset',
      schemaRef: 'LLMProfile',
      icon: '🧪',
      labelKey: 'llm_profiles.test',
      defaultData: () => ({ name: 'Test' }),
      active: true,
    };
    registerNode(cfg);
    const got = getNodeRegistration('test-llm-profile');
    expect(got).toBeDefined();
    expect(got.type).toBe('test-llm-profile');
    expect(got.category).toBe('asset');
    expect(got.defaultData()).toEqual({ name: 'Test' });
  });

  it('getNodeRegistration returns undefined for unknown type', () => {
    expect(getNodeRegistration('not-a-real-type')).toBeUndefined();
  });

  it('registerNode overwrites an existing entry', () => {
    registerNode({ type: 'ovr-1', component: stubComponent, category: 'asset', schemaRef: 'X', icon: 'i', labelKey: 'k', defaultData: () => ({}), active: true });
    registerNode({ type: 'ovr-1', component: stubComponent, category: 'workflow', schemaRef: 'X', icon: 'i', labelKey: 'k', defaultData: () => ({}), active: false });
    const got = getNodeRegistration('ovr-1');
    expect(got.category).toBe('workflow');
    expect(got.active).toBe(false);
  });

  it('getNodesByCategory filters by category', () => {
    registerNode({ type: 'a1', component: stubComponent, category: 'asset', schemaRef: '', icon: '', labelKey: '', defaultData: () => ({}), active: true });
    registerNode({ type: 'a2', component: stubComponent, category: 'asset', schemaRef: '', icon: '', labelKey: '', defaultData: () => ({}), active: true });
    registerNode({ type: 'w1', component: stubComponent, category: 'workflow', schemaRef: '', icon: '', labelKey: '', defaultData: () => ({}), active: true });

    const assets = getNodesByCategory('asset');
    const workflows = getNodesByCategory('workflow');
    expect(assets.some((n) => n.type === 'a1')).toBe(true);
    expect(assets.some((n) => n.type === 'a2')).toBe(true);
    expect(assets.every((n) => n.category === 'asset')).toBe(true);
    expect(workflows.every((n) => n.category === 'workflow')).toBe(true);
  });

  it('getAllRegisteredNodes returns every entry', () => {
    const before = getAllRegisteredNodes().length;
    registerNode({ type: 'all-1', component: stubComponent, category: 'asset', schemaRef: '', icon: '', labelKey: '', defaultData: () => ({}), active: true });
    const after = getAllRegisteredNodes().length;
    expect(after).toBe(before + 1);
  });
});

// ---------------------------------------------------------------------------
// Edge registration
// ---------------------------------------------------------------------------

describe('registry — edge registration', () => {
  it('registerEdge + getEdgeRegistration round-trip', () => {
    const cfg = { type: 'test-uses-llm', component: stubComponent, category: 'semantic' };
    registerEdge(cfg);
    const got = getEdgeRegistration('test-uses-llm');
    expect(got).toBeDefined();
    expect(got.category).toBe('semantic');
  });

  it('getEdgeRegistration returns undefined for unknown type', () => {
    expect(getEdgeRegistration('not-a-real-edge')).toBeUndefined();
  });

  it('getEdgesByCategory filters by category', () => {
    registerEdge({ type: 'sem-x', component: stubComponent, category: 'semantic' });
    registerEdge({ type: 'cf-x', component: stubComponent, category: 'control_flow' });

    const semantic = getEdgesByCategory('semantic');
    const cf = getEdgesByCategory('control_flow');
    expect(semantic.some((e) => e.type === 'sem-x')).toBe(true);
    expect(cf.some((e) => e.type === 'cf-x')).toBe(true);
  });

  it('getAllRegisteredEdges returns every entry', () => {
    const before = getAllRegisteredEdges().length;
    registerEdge({ type: 'all-e', component: stubComponent, category: 'semantic' });
    const after = getAllRegisteredEdges().length;
    expect(after).toBe(before + 1);
  });
});

// ---------------------------------------------------------------------------
// Builder helpers for SvelteFlow
// ---------------------------------------------------------------------------

describe('registry — getNodeTypes / getEdgeTypes', () => {
  it('getNodeTypes returns a record keyed by type → component', () => {
    const Comp = stubComponent;
    registerNode({ type: 'map-1', component: Comp, category: 'asset', schemaRef: '', icon: '', labelKey: '', defaultData: () => ({}), active: true });
    const map = getNodeTypes();
    expect(map['map-1']).toBe(Comp);
  });

  it('getEdgeTypes returns a record keyed by type → component', () => {
    const Comp = stubComponent;
    registerEdge({ type: 'map-e', component: Comp, category: 'semantic' });
    const map = getEdgeTypes();
    expect(map['map-e']).toBe(Comp);
  });
});

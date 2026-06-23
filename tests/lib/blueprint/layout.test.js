/**
 * Tests for src/lib/blueprint/layout.js — ELK auto-layout engine wrapper.
 *
 * ELK is a heavy native module; we mock it via vi.mock so the tests run
 * in milliseconds and don't require any WebAssembly on the CI host.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const runLayoutMock = vi.fn();
vi.mock('../../../src/lib/elk-service.js', () => ({
  runLayout: (...args) => runLayoutMock(...args),
}));

// Import AFTER vi.mock so the import is replaced.
const { calculateBlueprintLayout, applyBlueprintLayout } = await import(
  '../../../src/lib/blueprint/layout.js'
);

beforeEach(() => {
  runLayoutMock.mockReset();
});

// ---------------------------------------------------------------------------
// calculateBlueprintLayout
// ---------------------------------------------------------------------------

describe('calculateBlueprintLayout — happy path', () => {
  it('returns an empty Map for empty nodes', async () => {
    const positions = await calculateBlueprintLayout([], []);
    expect(positions).toBeInstanceOf(Map);
    expect(positions.size).toBe(0);
  });

  it('extracts positions from the ELK result', async () => {
    runLayoutMock.mockResolvedValueOnce({
      id: 'blueprint-root',
      x: 0,
      y: 0,
      children: [
        { id: 'n1', x: 100, y: 200 },
        { id: 'n2', x: 400, y: 500 },
      ],
    });

    const positions = await calculateBlueprintLayout(
      [
        { id: 'n1', type: 'wf-strategist', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'wf-critic', position: { x: 0, y: 0 } },
      ],
      [],
    );
    expect(positions.get('n1')).toEqual({ x: 100, y: 200 });
    expect(positions.get('n2')).toEqual({ x: 400, y: 500 });
  });

  it('sends the right edge shape to ELK (sources/targets arrays)', async () => {
    runLayoutMock.mockResolvedValueOnce({ id: 'r', children: [] });

    await calculateBlueprintLayout(
      [{ id: 'a', type: 'wf-input' }, { id: 'b', type: 'wf-strategist' }],
      [{ id: 'e1', source: 'a', target: 'b' }],
    );

    const call = runLayoutMock.mock.calls[0][0];
    expect(call.edges).toEqual([{ id: 'e1', sources: ['a'], targets: ['b'] }]);
  });

  it('uses elkOptionsWithChildren when there are phase containers', async () => {
    runLayoutMock.mockResolvedValueOnce({ id: 'r', children: [] });

    await calculateBlueprintLayout(
      [{ id: 'p1', type: 'wf-phase' }, { id: 'c1', type: 'wf-strategist', parentId: 'p1' }],
      [],
    );

    const call = runLayoutMock.mock.calls[0][0];
    expect(call.layoutOptions['elk.hierarchyHandling']).toBe('INCLUDE_CHILDREN');
  });

  it('does NOT include elk.hierarchyHandling when there are no phases', async () => {
    runLayoutMock.mockResolvedValueOnce({ id: 'r', children: [] });

    await calculateBlueprintLayout(
      [{ id: 'a', type: 'wf-strategist' }, { id: 'b', type: 'wf-critic' }],
      [],
    );

    const call = runLayoutMock.mock.calls[0][0];
    expect(call.layoutOptions['elk.hierarchyHandling']).toBeUndefined();
  });

  it('places phase children inside the phase elk node', async () => {
    runLayoutMock.mockResolvedValueOnce({ id: 'r', children: [] });

    await calculateBlueprintLayout(
      [
        { id: 'p1', type: 'wf-phase' },
        { id: 'c1', type: 'wf-strategist', parentId: 'p1' },
        { id: 'c2', type: 'wf-critic', parentId: 'p1' },
      ],
      [],
    );

    const call = runLayoutMock.mock.calls[0][0];
    const phaseNode = call.children.find((c) => c.id === 'p1');
    expect(phaseNode).toBeDefined();
    expect(phaseNode.children.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('reads parentId from node.data.parentId as a fallback', async () => {
    runLayoutMock.mockResolvedValueOnce({ id: 'r', children: [] });

    await calculateBlueprintLayout(
      [
        { id: 'p1', type: 'wf-phase' },
        { id: 'c1', type: 'wf-strategist', data: { parentId: 'p1' } },
      ],
      [],
    );

    const call = runLayoutMock.mock.calls[0][0];
    const phaseNode = call.children.find((c) => c.id === 'p1');
    expect(phaseNode.children.map((c) => c.id)).toEqual(['c1']);
  });

  it('recurse: extracts positions from nested children', async () => {
    runLayoutMock.mockResolvedValueOnce({
      id: 'r',
      children: [
        {
          id: 'p1', x: 0, y: 0,
          children: [
            { id: 'c1', x: 50, y: 60 },
          ],
        },
      ],
    });

    const positions = await calculateBlueprintLayout(
      [
        { id: 'p1', type: 'wf-phase' },
        { id: 'c1', type: 'wf-strategist', parentId: 'p1' },
      ],
      [],
    );
    expect(positions.get('c1')).toEqual({ x: 50, y: 60 });
  });
});

// ---------------------------------------------------------------------------
// applyBlueprintLayout
// ---------------------------------------------------------------------------

describe('applyBlueprintLayout', () => {
  it('is a no-op for an empty canvas', async () => {
    const store = { nodes: [], edges: [], setNodes: vi.fn() };
    await applyBlueprintLayout(store);
    expect(store.setNodes).not.toHaveBeenCalled();
  });

  it('updates node positions from the layout result', async () => {
    runLayoutMock.mockResolvedValueOnce({
      id: 'r',
      children: [
        { id: 'a', x: 10, y: 20 },
        { id: 'b', x: 100, y: 200 },
      ],
    });

    const store = {
      nodes: [
        { id: 'a', type: 'wf-strategist', position: { x: 0, y: 0 } },
        { id: 'b', type: 'wf-critic', position: { x: 0, y: 0 } },
      ],
      edges: [],
      setNodes: vi.fn(),
    };
    await applyBlueprintLayout(store);

    expect(store.setNodes).toHaveBeenCalledOnce();
    const newNodes = store.setNodes.mock.calls[0][0];
    expect(newNodes[0].position).toEqual({ x: 10, y: 20 });
    expect(newNodes[1].position).toEqual({ x: 100, y: 200 });
  });

  it('keeps a node unchanged when ELK does not return a position for it', async () => {
    runLayoutMock.mockResolvedValueOnce({
      id: 'r',
      children: [{ id: 'a', x: 10, y: 20 }],
    });

    const store = {
      nodes: [
        { id: 'a', type: 'wf-strategist', position: { x: 0, y: 0 } },
        { id: 'b', type: 'wf-critic', position: { x: 5, y: 5 } },
      ],
      edges: [],
      setNodes: vi.fn(),
    };
    await applyBlueprintLayout(store);
    const newNodes = store.setNodes.mock.calls[0][0];
    expect(newNodes[1].position).toEqual({ x: 5, y: 5 });
  });

  it('catches and logs ELK errors without throwing', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    runLayoutMock.mockRejectedValueOnce(new Error('ELK boom'));

    const store = {
      nodes: [{ id: 'a', type: 'wf-strategist', position: { x: 0, y: 0 } }],
      edges: [],
      setNodes: vi.fn(),
    };
    await expect(applyBlueprintLayout(store)).resolves.toBeUndefined();
    expect(store.setNodes).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

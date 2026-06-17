/**
 * Tests for src/lib/blueprint/dnd.js — drag-and-drop helpers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  screenToFlowPosition,
  createDraftNode,
  getDefaultData,
  handlePaletteDragStart,
  handleEntityDragStart,
  getNodeTypeFromDrop,
  getEntityIdFromDrop,
  createEntityNode,
} from '../../../src/lib/blueprint/dnd.js';

// ---------------------------------------------------------------------------
// screenToFlowPosition
// ---------------------------------------------------------------------------

describe('screenToFlowPosition', () => {
  it('converts screen coordinates to canvas coordinates', () => {
    const event = { clientX: 250, clientY: 350 };
    const viewport = { x: 50, y: 100, zoom: 2 };
    const bounds = { left: 10, top: 20, right: 1000, bottom: 1000 };
    const pos = screenToFlowPosition(event, viewport, bounds);
    expect(pos.x).toBe((250 - 10 - 50) / 2);
    expect(pos.y).toBe((350 - 20 - 100) / 2);
  });

  it('respects zoom = 1', () => {
    const event = { clientX: 100, clientY: 100 };
    const pos = screenToFlowPosition(event, { x: 0, y: 0, zoom: 1 }, { left: 0, top: 0 });
    expect(pos).toEqual({ x: 100, y: 100 });
  });

  it('handles negative viewport (panned origin)', () => {
    const event = { clientX: 200, clientY: 200 };
    const pos = screenToFlowPosition(event, { x: -100, y: -100, zoom: 1 }, { left: 0, top: 0 });
    expect(pos).toEqual({ x: 300, y: 300 });
  });
});

// ---------------------------------------------------------------------------
// createDraftNode
// ---------------------------------------------------------------------------

describe('createDraftNode', () => {
  it('returns a node with the given type and position', () => {
    const node = createDraftNode('llm-profile', { x: 50, y: 75 });
    expect(node.type).toBe('llm-profile');
    expect(node.position).toEqual({ x: 50, y: 75 });
  });

  it('marks the node as draft and assigns a blueprint_id', () => {
    const node = createDraftNode('wf-strategist', { x: 0, y: 0 });
    expect(node.data.isDraft).toBe(true);
    expect(node.data.blueprint_id).toBe(node.id);
  });

  it('assigns a draft- prefix to the id', () => {
    const node = createDraftNode('wf-critic', { x: 0, y: 0 });
    expect(node.id.startsWith('draft-')).toBe(true);
  });

  it('uses default data for the type', () => {
    const node = createDraftNode('llm-profile', { x: 0, y: 0 });
    expect(node.data.name).toBe('New LLM Profile');
    expect(node.data.temperature).toBe(0.7);
  });

  it('two drafts have different ids', () => {
    const a = createDraftNode('wf-input', { x: 0, y: 0 });
    const b = createDraftNode('wf-input', { x: 0, y: 0 });
    expect(a.id).not.toBe(b.id);
  });

  it('empty default data for unknown type', () => {
    const node = createDraftNode('not-a-real-type', { x: 0, y: 0 });
    expect(node.data.isDraft).toBe(true);
    expect(node.data.name).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getDefaultData
// ---------------------------------------------------------------------------

describe('getDefaultData', () => {
  it('returns a *copy* of the default data (not a reference)', () => {
    const a = getDefaultData('wf-strategist');
    const b = getDefaultData('wf-strategist');
    a.label = 'mutated';
    expect(b.label).not.toBe('mutated');
  });

  it('returns empty object for unknown type', () => {
    expect(getDefaultData('not-a-type')).toEqual({});
  });

  it('wf-user-injection default has user_query config', () => {
    const d = getDefaultData('wf-user-injection');
    expect(d.config.input_type).toBe('user_query');
  });

  it('wf-gate default has empty condition', () => {
    const d = getDefaultData('wf-gate');
    expect(d.config.condition).toBe('');
  });

  it('wf-phase default has roles + color + max_rounds', () => {
    const d = getDefaultData('wf-phase');
    expect(d.config.color).toMatch(/^#/);
    expect(d.config.max_rounds).toBe(3);
    expect(Array.isArray(d.config.roles)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// handlePaletteDragStart / handleEntityDragStart
// ---------------------------------------------------------------------------

describe('handlePaletteDragStart / handleEntityDragStart', () => {
  let dataTransfer;

  beforeEach(() => {
    const store = new Map();
    dataTransfer = {
      setData: (k, v) => store.set(k, v),
      getData: (k) => store.get(k) ?? '',
      effectAllowed: '',
    };
  });

  it('handlePaletteDragStart sets the node type mime type', () => {
    const event = { dataTransfer };
    handlePaletteDragStart(event, 'wf-strategist');
    expect(dataTransfer.getData('application/blueprint-node-type')).toBe('wf-strategist');
    expect(dataTransfer.effectAllowed).toBe('move');
  });

  it('handlePaletteDragStart is a no-op when dataTransfer is missing', () => {
    expect(() => handlePaletteDragStart({}, 'wf-strategist')).not.toThrow();
  });

  it('handleEntityDragStart sets both mime types', () => {
    const event = { dataTransfer };
    handleEntityDragStart(event, 'llm-profile', 'entity-123');
    expect(dataTransfer.getData('application/blueprint-node-type')).toBe('llm-profile');
    expect(dataTransfer.getData('application/blueprint-entity-id')).toBe('entity-123');
  });

  it('handleEntityDragStart is a no-op when dataTransfer is missing', () => {
    expect(() => handleEntityDragStart({}, 'llm-profile', 'id-1')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getNodeTypeFromDrop / getEntityIdFromDrop
// ---------------------------------------------------------------------------

describe('getNodeTypeFromDrop / getEntityIdFromDrop', () => {
  it('reads the node type mime', () => {
    const dt = { getData: (k) => (k === 'application/blueprint-node-type' ? 'wf-critic' : '') };
    expect(getNodeTypeFromDrop({ dataTransfer: dt })).toBe('wf-critic');
  });

  it('reads the entity id mime', () => {
    const dt = { getData: (k) => (k === 'application/blueprint-entity-id' ? 'ent-7' : '') };
    expect(getEntityIdFromDrop({ dataTransfer: dt })).toBe('ent-7');
  });

  it('returns null when dataTransfer is missing', () => {
    expect(getNodeTypeFromDrop({})).toBeNull();
    expect(getEntityIdFromDrop({})).toBeNull();
  });

  it('returns null when the mime is empty', () => {
    const dt = { getData: () => '' };
    expect(getNodeTypeFromDrop({ dataTransfer: dt })).toBeNull();
    expect(getEntityIdFromDrop({ dataTransfer: dt })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createEntityNode
// ---------------------------------------------------------------------------

describe('createEntityNode', () => {
  it('uses an entity- prefix for the id', () => {
    const n = createEntityNode('llm-profile', 'abc-123', { name: 'MyProfile' }, { x: 0, y: 0 });
    expect(n.id).toBe('entity-abc-123');
  });

  it('marks the node as not-draft', () => {
    const n = createEntityNode('wf-strategist', 'id-1', {}, { x: 0, y: 0 });
    expect(n.data.isDraft).toBe(false);
  });

  it('preserves blueprint_id from the entity id', () => {
    const n = createEntityNode('llm-profile', 'ent-7', {}, { x: 0, y: 0 });
    expect(n.data.blueprint_id).toBe('ent-7');
  });

  it('merges the entity data into node data', () => {
    const n = createEntityNode('llm-profile', 'ent-1', { name: 'OpenAI', provider: 'openai' }, { x: 0, y: 0 });
    expect(n.data.name).toBe('OpenAI');
    expect(n.data.provider).toBe('openai');
  });

  it('preserves the position', () => {
    const n = createEntityNode('wf-critic', 'id-1', {}, { x: 123, y: 456 });
    expect(n.position).toEqual({ x: 123, y: 456 });
  });
});

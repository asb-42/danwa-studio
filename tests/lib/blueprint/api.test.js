/**
 * Tests for src/lib/blueprint/api.js — Blueprint REST client.
 *
 * We focus on the URL/method/body shape (not the actual HTTP), since the
 * underlying `request()` is already covered in `lib/api.test.js`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../../src/lib/api.js', () => ({
  request: vi.fn(),
}));

import { request } from '../../../src/lib/api.js';
const api = await import('../../../src/lib/blueprint/api.js');

beforeEach(() => {
  vi.clearAllMocks();
  request.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// LLM Profiles
// ---------------------------------------------------------------------------

describe('Blueprint API — LLM profiles', () => {
  it('listBlueprintLLMProfiles uses default paging', async () => {
    await api.listBlueprintLLMProfiles();
    const [path] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/llm-profiles?limit=100&offset=0');
  });

  it('listBlueprintLLMProfiles honours custom paging', async () => {
    await api.listBlueprintLLMProfiles({ limit: 10, offset: 5 });
    const [path] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/llm-profiles?limit=10&offset=5');
  });

  it('getBlueprintLLMProfile forwards the id in the path', async () => {
    // The current implementation does NOT URL-encode the id; we just pin
    // the contract that the id is interpolated into the URL.
    await api.getBlueprintLLMProfile('abc-123');
    const [path] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/llm-profiles/abc-123');
  });

  it('createBlueprintLLMProfile posts JSON', async () => {
    const body = { name: 'X' };
    await api.createBlueprintLLMProfile(body);
    const [path, opts] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/llm-profiles');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual(body);
  });

  it('updateBlueprintLLMProfile puts JSON', async () => {
    await api.updateBlueprintLLMProfile('id-1', { name: 'Y' });
    const [path, opts] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/llm-profiles/id-1');
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body)).toEqual({ name: 'Y' });
  });

  it('deleteBlueprintLLMProfile sends DELETE', async () => {
    await api.deleteBlueprintLLMProfile('id-1');
    const [path, opts] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/llm-profiles/id-1');
    expect(opts.method).toBe('DELETE');
  });
});

// ---------------------------------------------------------------------------
// Prompt templates
// ---------------------------------------------------------------------------

describe('Blueprint API — prompt templates', () => {
  it('listPromptTemplates with no filters', async () => {
    await api.listPromptTemplates();
    const [path] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/prompt-templates?limit=100&offset=0');
  });

  it('listPromptTemplates with role + variant filter', async () => {
    await api.listPromptTemplates({ role: 'strategist', variant: 'default' });
    const [path] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/prompt-templates?limit=100&offset=0&role=strategist&variant=default');
  });

  it('getPromptTemplate interpolates the id', async () => {
    await api.getPromptTemplate('a-b');
    const [path] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/prompt-templates/a-b');
  });

  it('createPromptTemplate posts JSON', async () => {
    await api.createPromptTemplate({ content: 'x' });
    const [path, opts] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/prompt-templates');
    expect(opts.method).toBe('POST');
  });

  it('updatePromptTemplate puts JSON', async () => {
    await api.updatePromptTemplate('t-1', { content: 'y' });
    const [path, opts] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/prompt-templates/t-1');
    expect(opts.method).toBe('PUT');
  });

  it('deletePromptTemplate sends DELETE', async () => {
    await api.deletePromptTemplate('t-1');
    const [, opts] = request.mock.calls[0];
    expect(opts.method).toBe('DELETE');
  });
});

// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------

describe('Blueprint API — role definitions', () => {
  it('listRoleDefinitions with no filters', async () => {
    await api.listRoleDefinitions();
    const [path] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/role-definitions?limit=100&offset=0');
  });

  it('listRoleDefinitions with role filter', async () => {
    await api.listRoleDefinitions({ role: 'critic' });
    const [path] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/role-definitions?limit=100&offset=0&role=critic');
  });

  it('getRoleDefinition interpolates the id', async () => {
    await api.getRoleDefinition('r-1');
    const [path] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/role-definitions/r-1');
  });

  it('createRoleDefinition posts JSON', async () => {
    await api.createRoleDefinition({ id: 'r' });
    const [, opts] = request.mock.calls[0];
    expect(opts.method).toBe('POST');
  });

  it('updateRoleDefinition puts JSON', async () => {
    await api.updateRoleDefinition('r-1', { id: 'r-1' });
    const [, opts] = request.mock.calls[0];
    expect(opts.method).toBe('PUT');
  });

  it('deleteRoleDefinition sends DELETE', async () => {
    await api.deleteRoleDefinition('r-1');
    const [, opts] = request.mock.calls[0];
    expect(opts.method).toBe('DELETE');
  });
});

// ---------------------------------------------------------------------------
// Agent blueprints
// ---------------------------------------------------------------------------

describe('Blueprint API — agent blueprints', () => {
  it('listAgentBlueprints with no filters', async () => {
    await api.listAgentBlueprints();
    const [path] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/agent-blueprints?limit=100&offset=0');
  });

  it('listAgentBlueprints active_only=true', async () => {
    // The API expects the snake_case key 'active_only', not 'activeOnly'.
    await api.listAgentBlueprints({ active_only: true });
    const [path] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/agent-blueprints?limit=100&offset=0&active_only=true');
  });

  it('getAgentBlueprint interpolates the id', async () => {
    await api.getAgentBlueprint('a-1');
    const [path] = request.mock.calls[0];
    expect(path).toBe('/api/v1/blueprints/agent-blueprints/a-1');
  });

  it('createAgentBlueprint posts JSON', async () => {
    await api.createAgentBlueprint({});
    const [, opts] = request.mock.calls[0];
    expect(opts.method).toBe('POST');
  });

  it('updateAgentBlueprint puts JSON', async () => {
    await api.updateAgentBlueprint('a-1', {});
    const [, opts] = request.mock.calls[0];
    expect(opts.method).toBe('PUT');
  });

  it('deleteAgentBlueprint sends DELETE', async () => {
    await api.deleteAgentBlueprint('a-1');
    const [, opts] = request.mock.calls[0];
    expect(opts.method).toBe('DELETE');
  });
});

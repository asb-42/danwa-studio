/**
 * Tests for src/lib/catalog/api.js — LLM-catalog client functions.
 *
 * The actual HTTP is delegated to `request()` (which we mock per-test).
 *
 * @danwa/api-client is mocked globally in tests/setup.js so the transitive
 * import from src/lib/api.js doesn't blow up in CI.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../../src/lib/api.js', () => ({
  request: vi.fn(),
}));

const { request } = await import('../../../src/lib/api.js');

const {
  listCatalogSources,
  fetchCatalogSource,
  fetchAllCatalogSources,
  getCatalog,
  runCatalogImport,
  publishNewModules,
} = await import('../../../src/lib/catalog/api.js');

beforeEach(() => {
  vi.clearAllMocks();
  request.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// listCatalogSources
// ---------------------------------------------------------------------------

describe('listCatalogSources', () => {
  it('calls GET /catalog/sources', async () => {
    await listCatalogSources();
    expect(request).toHaveBeenCalledWith('/api/v1/catalog/sources');
  });
});

// ---------------------------------------------------------------------------
// fetchCatalogSource
// ---------------------------------------------------------------------------

describe('fetchCatalogSource', () => {
  it('encodes the source name in the URL', async () => {
    await fetchCatalogSource('catwalk');
    const [path, opts] = request.mock.calls[0];
    expect(path).toBe('/api/v1/catalog/sources/catwalk/fetch');
    expect(opts.method).toBe('POST');
  });

  it('adds ?force=true when force=true', async () => {
    await fetchCatalogSource('llm_db', { force: true });
    const [path] = request.mock.calls[0];
    expect(path).toBe('/api/v1/catalog/sources/llm_db/fetch?force=true');
  });

  it('does not add ?force by default', async () => {
    await fetchCatalogSource('catwalk', {});
    const [path] = request.mock.calls[0];
    expect(path).not.toContain('force');
  });

  it('URL-encodes special characters in the source name', async () => {
    await fetchCatalogSource('cat/walk?x=1');
    const [path] = request.mock.calls[0];
    expect(path).toBe('/api/v1/catalog/sources/cat%2Fwalk%3Fx%3D1/fetch');
  });
});

// ---------------------------------------------------------------------------
// fetchAllCatalogSources
// ---------------------------------------------------------------------------

describe('fetchAllCatalogSources', () => {
  it('POST /catalog/fetch-all', async () => {
    await fetchAllCatalogSources();
    expect(request).toHaveBeenCalledWith('/api/v1/catalog/fetch-all', { method: 'POST' });
  });
});

// ---------------------------------------------------------------------------
// getCatalog
// ---------------------------------------------------------------------------

describe('getCatalog', () => {
  it('returns the unfiltered catalog by default', async () => {
    await getCatalog();
    expect(request).toHaveBeenCalledWith('/api/v1/catalog/catalog');
  });

  it('adds ?source=<name> when filter is given', async () => {
    await getCatalog({ source: 'catwalk' });
    expect(request).toHaveBeenCalledWith('/api/v1/catalog/catalog?source=catwalk');
  });

  it('omits ?source when source=null', async () => {
    await getCatalog({ source: null });
    expect(request).toHaveBeenCalledWith('/api/v1/catalog/catalog');
  });
});

// ---------------------------------------------------------------------------
// runCatalogImport
// ---------------------------------------------------------------------------

describe('runCatalogImport', () => {
  it('dry-run by default (dry_run=true)', async () => {
    await runCatalogImport();
    const [path, opts] = request.mock.calls[0];
    expect(path).toBe('/api/v1/catalog/import?dry_run=true');
    expect(opts.method).toBe('POST');
  });

  it('dry_run=false when explicitly requested', async () => {
    await runCatalogImport({ dryRun: false });
    expect(request.mock.calls[0][0]).toBe('/api/v1/catalog/import?dry_run=false');
  });

  it('appends sources list when given', async () => {
    await runCatalogImport({ dryRun: true, sources: ['catwalk', 'llm_db'] });
    expect(request.mock.calls[0][0]).toBe('/api/v1/catalog/import?dry_run=true&sources=catwalk%2Cllm_db');
  });

  it('omits sources when array is empty', async () => {
    await runCatalogImport({ sources: [] });
    expect(request.mock.calls[0][0]).toBe('/api/v1/catalog/import?dry_run=true');
  });
});

// ---------------------------------------------------------------------------
// publishNewModules
// ---------------------------------------------------------------------------

describe('publishNewModules', () => {
  it('returns an empty list for an empty input', async () => {
    const out = await publishNewModules([]);
    expect(out).toEqual([]);
  });

  it('returns an empty list for a non-array input', async () => {
    const out = await publishNewModules(null);
    expect(out).toEqual([]);
  });
});

/**
 * Tests for src/lib/api.js — generic request() wrapper.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { request, api } from '../../src/lib/api.js';

// ---------------------------------------------------------------------------
// fetch mock
// ---------------------------------------------------------------------------

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// request() — happy path
// ---------------------------------------------------------------------------

describe('request() — success', () => {
  it('calls fetch with the right URL + default headers', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ data: 1 }),
    });

    const result = await request('/api/v1/blueprints');
    expect(result).toEqual({ data: 1 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/blueprints');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('passes through custom headers + body + method', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 200, statusText: 'OK', json: async () => ({}),
    });

    await request('/blueprints', {
      method: 'POST',
      headers: { 'X-Custom': 'yes' },
      body: JSON.stringify({ name: 'X' }),
    });

    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.headers['X-Custom']).toBe('yes');
    // The current implementation: options.headers is spread AFTER the default
    // Content-Type, so a caller's explicit Content-Type wins.  We just
    // assert the X-Custom header was forwarded (the default Content-Type
    // is preserved unless the caller overrides it).
  });

  it('returns null for HTTP 204 No Content', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 204, statusText: 'No Content', json: async () => { throw new Error('no body'); },
    });
    const result = await request('/blueprints/abc', { method: 'DELETE' });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// request() — error path
// ---------------------------------------------------------------------------

describe('request() — error', () => {
  it('throws Error with .detail from JSON body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ detail: 'invalid name' }),
    });

    await expect(request('/x', { method: 'POST' })).rejects.toThrow('invalid name');
  });

  it('falls back to statusText when body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => { throw new Error('not json'); },
    });

    await expect(request('/x')).rejects.toThrow('Internal Server Error');
  });

  it('falls back to "HTTP <code>" when no detail and no statusText', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 418,
      statusText: '',
      json: async () => { throw new Error('not json'); },
    });

    await expect(request('/x')).rejects.toThrow('HTTP 418');
  });
});

// ---------------------------------------------------------------------------
// `api` re-export
// ---------------------------------------------------------------------------

describe('api re-export', () => {
  it('exposes a non-undefined object (the @danwa/api-client bundle)', () => {
    expect(api).toBeDefined();
    // The actual shape is defined by the @danwa/api-client package, which
    // may or may not be installed in CI.  We only assert it's a real object.
    expect(typeof api).toBe('object');
  });
});

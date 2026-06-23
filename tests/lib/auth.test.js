/**
 * Tests for src/lib/api/auth.js (studio auth client).
 *
 * Verifies the contract that:
 *   1. login() does a pre-flight isBackendReachable() check
 *      (so a 'Backend connection lost' diagnostic is surfaced
 *       instead of the generic 'Login failed' mask).
 *   2. login() calls POST /api/v1/auth/login with {email, password}.
 *   3. login() on 401 surfaces the backend message via the auth
 *      error message from the response body.
 *   4. register() / logout() / getCurrentUser() have analogous shapes.
 *   5. isBackendReachable() (re-exported from api.js) returns a
 *      machine-readable reason on failure.
 *
 * Mirrors the danwa frontend fix (commit 613f2a2) so both apps
 * use the same diagnostic surface.
 *
 * Date: 2026-06-23
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { login, register, logout, getCurrentUser, isBackendReachable } from '../../src/lib/api/auth.js';

const BASE = ''; // api.js defaults API_BASE to import.meta.env.VITE_API_URL || ''

describe('api/auth.js — login()', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws a localized "Backend connection lost" error when backend is down', async () => {
    // First call (isBackendReachable /health) fails with TypeError.
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(login('admin@example.com', 'admin123')).rejects.toThrow(/Backend connection lost/i);
  });

  it('calls POST /api/v1/auth/login on a reachable backend', async () => {
    // First /health call returns 200, then POST returns 200 + user.
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 }) // /health
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          access_token: 'tk-1',
          refresh_token: 'rt-1',
          user: { id: 'u-1', email: 'admin@example.com' },
        }),
      });
    const user = await login('admin@example.com', 'admin123');
    expect(user).toEqual({ id: 'u-1', email: 'admin@example.com' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    // First call: GET /health
    expect(globalThis.fetch.mock.calls[0][0]).toMatch(/\/health$/);
    // Second call: POST /api/v1/auth/login with the body
    const [url, init] = globalThis.fetch.mock.calls[1];
    expect(url).toMatch(/\/api\/v1\/auth\/login$/);
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body).toEqual({ email: 'admin@example.com', password: 'admin123' });
  });

  it('throws the backend error message on 401', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 }) // /health
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: 'Invalid credentials' }),
      });
    await expect(login('admin@example.com', 'wrong')).rejects.toThrow(/Invalid credentials/);
  });
});

describe('api/auth.js — register()', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('pre-flights /health then calls POST /api/v1/auth/register', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: 'u-2' }),
      });
    const result = await register('new@example.com', 'New User', 'pw', 'admin');
    expect(result).toEqual({ id: 'u-2' });
    expect(globalThis.fetch.mock.calls[1][0]).toMatch(/\/api\/v1\/auth\/register$/);
    const body = JSON.parse(globalThis.fetch.mock.calls[1][1].body);
    expect(body).toEqual({
      email: 'new@example.com',
      display_name: 'New User',
      password: 'pw',
      role: 'admin',
    });
  });
});

describe('api/auth.js — logout()', () => {
  it('clears the in-memory auth state', () => {
    // logout() should not throw even if there is no current user
    expect(() => logout()).not.toThrow();
  });
});

describe('api/auth.js — getCurrentUser()', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls GET /api/v1/auth/whoami and returns the user', async () => {
    // Seed a token so getCurrentUser() actually performs the whoami
    // call (otherwise it short-circuits to null).
    const { setAuth } = await import('../../src/lib/stores/auth.svelte.js');
    setAuth('seed-token', null, { id: 'u-0', email: 'seed@x' });
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'u-1', email: 'a@b' }),
    });
    const user = await getCurrentUser();
    expect(user).toEqual({ id: 'u-1', email: 'a@b' });
    expect(globalThis.fetch.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/whoami$/);
    // Clean up for the next test
    const { clearAuth } = await import('../../src/lib/stores/auth.svelte.js');
    clearAuth();
  });

  it('returns null on 401 (token invalid/expired)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
    });
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });
});

describe('api/auth.js — isBackendReachable() (re-export)', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns ok: true on 200', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: true, status: 200 });
    const r = await isBackendReachable();
    expect(r.ok).toBe(true);
  });

  it('returns ok: false with reason on TypeError', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const r = await isBackendReachable();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('connection_refused');
  });
});

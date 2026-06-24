/**
 * src/lib/api/auth.js — Studio auth client.
 *
 * Replaces the previous mock auth (App.svelte:54, "Mock auth store -
 * will be replaced with real auth") with a real wire to the
 * danwa-core backend. Pre-flights /health before login/register so
 * a "Backend connection lost" diagnostic is surfaced instead of the
 * generic "Login failed" / "Registration failed" mask.
 *
 * Mirrors the danwa-frontend fix (commit 613f2a2, danwa repo) so
 * both apps use the same diagnostic surface.
 *
 * Endpoints (danwa-core):
 *   POST /api/v1/auth/login       → {access_token, refresh_token, user}
 *   POST /api/v1/auth/register    → {id, email, ...}
 *   POST /api/v1/auth/logout      → 204
 *   GET  /api/v1/auth/whoami      → {id, email, ...} | 401
 *
 * Public surface:
 *   - login(email, password)                 -> Promise<User>
 *   - register(email, name, password, role)  -> Promise<User>
 *   - logout()                                -> void (clears in-memory state)
 *   - getCurrentUser()                        -> Promise<User|null>
 *   - isBackendReachable()                    -> Promise<{ok, reason?}>
 *
 * Date: 2026-06-23
 */

import { request } from '../api.js';
import { setAuth, clearAuth, getAccessToken } from '../stores/auth.svelte.js';

export const REACHABILITY = Object.freeze({
  REACHABLE: 'reachable',
  CONNECTION_REFUSED: 'connection_refused',
  TIMEOUT: 'timeout',
  NETWORK_ERROR: 'network_error',
  UNHEALTHY: 'unhealthy',
});

/**
 * Probe the backend with a short timeout.
 *
 * IMPORTANT: we hit `/health` (a proxied route) and
 * NOT `/api/v1/system/status`, because that endpoint does not exist
 * in danwa-core. The Vite dev server on :5174 proxies /health to the
 * backend; if the backend is unreachable, Vite returns 502/500 and
 * we correctly diagnose the failure.
 *
 * When the backend is reachable we accept any 2xx, and also 401/403
 * (these mean the backend answered but the endpoint requires auth,
 * which is still a positive reachability signal).
 *
 * Same shape as danwa-frontend's isBackendReachable so the two
 * apps surface the same diagnostic.
 */
export async function isBackendReachable(opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 2500;
  // Guard for test environments where AbortController is unavailable.
  if (typeof AbortController === 'undefined') {
    return { ok: false, reason: REACHABILITY.NETWORK_ERROR };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('/health', {
      method: 'GET',
      signal: controller.signal,
    });
    if (response.ok) return { ok: true };
    // 401/403 means the backend is up but the endpoint needs auth —
    // still a positive reachability signal.
    if (response.status === 401 || response.status === 403) {
      return { ok: true, authRequired: true };
    }
    return { ok: false, reason: REACHABILITY.UNHEALTHY, status: response.status };
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return { ok: false, reason: REACHABILITY.TIMEOUT };
    }
    return { ok: false, reason: REACHABILITY.CONNECTION_REFUSED };
  } finally {
    clearTimeout(timer);
  }
}

function backendLostError() {
  return new Error('Backend connection lost');
}

/**
 * Login with email + password. Throws "Backend connection lost"
 * if the backend isn't reachable, or the backend's error message
 * (e.g. "Invalid credentials") on 401.
 */
export async function login(email, password) {
  const reach = await isBackendReachable({ timeoutMs: 2500 });
  if (!reach.ok) throw backendLostError();

  try {
    const data = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data && data.access_token && data.user) {
      setAuth(data.access_token, data.refresh_token || null, data.user);
    }
    return data.user;
  } catch (networkErr) {
    // The auth.api.js request() helper does not (yet) catch fetch
    // network errors; re-throw them as the localized diagnostic.
    if (networkErr && /Failed to fetch|NetworkError|aborted/i.test(String(networkErr.message))) {
      throw backendLostError();
    }
    throw networkErr;
  }
}

/**
 * Register a new user.
 */
export async function register(email, displayName, password, role = 'admin') {
  const reach = await isBackendReachable({ timeoutMs: 2500 });
  if (!reach.ok) throw backendLostError();

  return request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      display_name: displayName,
      password,
      role,
    }),
  });
}

/**
 * Logout — clear the in-memory auth state. Best-effort: we do not
 * call POST /api/v1/auth/logout because danwa-core does not yet
 * implement it (404 in the current backend). The server-side
 * token is still valid until its TTL expires; for a stronger
 * guarantee, add a token-blacklist endpoint on the backend.
 */
export function logout() {
  clearAuth();
}

/**
 * Return the currently authenticated user (from the local store)
 * or null if not authenticated.
 */
export function getCurrentUserSync() {
  return getAccessToken() ? null : null; // placeholder — see stores/auth.svelte.js
}

/**
 * Fetch the current user from the backend (uses the stored token).
 * Returns null on 401 (token expired/invalid).
 */
export async function getCurrentUser() {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/v1/auth/whoami', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

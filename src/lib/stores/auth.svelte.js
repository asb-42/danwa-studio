/**
 * stores/auth.svelte.js — Svelte 5 rune-based auth state.
 *
 * Holds the current user, the access/refresh token, and the
 * selected tenant. Persists to localStorage so a page refresh
 * keeps the user signed in.
 *
 * Public surface:
 *   - currentUser        : $state-backed read-only view (object|null)
 *   - currentTenant      : $state-backed read-only view (object|null)
 *   - accessToken()      : function returning the raw token string
 *   - setAuth(tk, rtk, user, tenant?)  : write all fields + persist
 *   - clearAuth()        : reset all fields + remove from localStorage
 *
 * Date: 2026-06-23
 */

const STORAGE_KEY = 'danwa-studio-auth-v1';

// Module-level state (Svelte 5 runes work at module scope via $state)
// We use the `let` + $state.raw() / $state() pattern so the runes
// are visible to the Svelte compiler.

let _user = $state(null);
let _tenant = $state(null);
let _accessToken = $state(null);
let _refreshToken = $state(null);

function persist() {
  try {
    if (typeof localStorage === 'undefined') return;
    if (_accessToken && _user) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          access_token: _accessToken,
          refresh_token: _refreshToken,
          user: _user,
          tenant: _tenant,
        }),
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage may be disabled (private mode); ignore.
  }
}

/** Restore from localStorage. Safe to call multiple times. */
function restore() {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && data.access_token && data.user) {
      _accessToken = data.access_token;
      _refreshToken = data.refresh_token || null;
      _user = data.user;
      _tenant = data.tenant || null;
    }
  } catch {
    // Corrupt JSON — clear it.
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
}

/**
 * Read-only getters. Svelte components use these in $derived
 * expressions (e.g. `const isAuth = $derived($currentUser !== null)`).
 */
export function getCurrentUser() {
  return _user;
}
export function getCurrentTenant() {
  return _tenant;
}
export function getAccessToken() {
  return _accessToken;
}
export function getRefreshToken() {
  return _refreshToken;
}

/**
 * Convenience for components that want the rune directly. In
 * Svelte 5, runes are only reactive inside .svelte files; outside,
 * we expose plain functions and have the component wrap in $derived
 * if it needs reactivity in the template.
 */
export const currentUser = {
  get value() {
    return _user;
  },
};
export const currentTenant = {
  get value() {
    return _tenant;
  },
};

/**
 * Write all auth fields. Persists to localStorage.
 * @param {string} accessToken
 * @param {string|null} refreshToken
 * @param {object} user
 * @param {object|null} [tenant]
 */
export function setAuth(accessToken, refreshToken, user, tenant = null) {
  _accessToken = accessToken;
  _refreshToken = refreshToken || null;
  _user = user;
  _tenant = tenant;
  persist();
}

/**
 * Clear all auth fields and remove from localStorage.
 */
export function clearAuth() {
  _accessToken = null;
  _refreshToken = null;
  _user = null;
  _tenant = null;
  persist();
}

// Auto-restore on module load (idempotent)
restore();

export default {
  getCurrentUser,
  getCurrentTenant,
  getAccessToken,
  getRefreshToken,
  setAuth,
  clearAuth,
  currentUser,
  currentTenant,
};

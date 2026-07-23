# Code Review: danwa-studio

**Date:** 2026-07-23  
**Reviewer:** Principal Staff Engineer  
**Scope:** API client, auth flow, state management, blueprint system, SSE handling

---

## 1. Executive Summary

danwa-studio is a Svelte 5 frontend for system operators. The auth flow is well-structured with reachability probing and proper token persistence. The most critical issue is a **broken `getCurrentUserSync` function** that always returns `null` — any code path relying on it silently treats every user as unauthenticated. The blueprint API layer uses a generic `request()` helper that does not attach the JWT `Authorization` header automatically, meaning authenticated endpoints may silently receive 401s unless every caller manually adds the header. No major security vulnerabilities found in the auth store (tokens in localStorage is the standard SPA pattern, though httpOnly cookies would be more robust).

---

## 2. Critical & High Severity Issues (Must Fix)

### 2.1 `getCurrentUserSync` Always Returns `null` — [Resilience]

- **Location:** `src/lib/api/auth.js:152` — `getCurrentUserSync()`
- **The Problem:** The function body is `return getAccessToken() ? null : null;` — both branches return `null` regardless of whether a token exists. This is clearly a placeholder that was never completed. Any component or route guard calling `getCurrentUserSync()` to check authentication state will always see `null`, defeating auth-gated UI.
- **The Fix:**

```javascript
import { getCurrentUser, getAccessToken } from '../stores/auth.svelte.js';

export function getCurrentUserSync() {
  // Return the in-memory user if we have a token; null otherwise.
  // Note: this is synchronous — it does not validate the token against
  // the backend. Use getCurrentUser() (async) for a validated check.
  if (!getAccessToken()) return null;
  return getCurrentUser();
}
```

### 2.2 `request()` Helper Does Not Attach Auth Header — [Security/Architecture]

- **Location:** `src/lib/api.js:16-23` — `request()`
- **The Problem:** The generic `request()` function (used by blueprint API, catalog API, modules API, etc.) builds headers from `options.headers` but never injects the `Authorization: Bearer <token>` header. The auth API (`auth.js`) uses `fetch()` directly with manual `Authorization` headers, but all other API consumers go through `request()` which omits it. This means either (a) authenticated endpoints return 401, or (b) the backend dev-mode auth (no auth required) is masking the problem in development.
- **The Fix:**

```javascript
import { getAccessToken } from './stores/auth.svelte.js';

export async function request(path, options = {}) {
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  // ... rest unchanged
}
```

---

## 3. Architectural & Design Improvements (Should Fix)

### 3.1 `api` Export Is a Placeholder Object — [Architecture]

- **Location:** `src/lib/api.js:47-51`
- **The Problem:** `export const api = { __placeholder: true }` is a stub replacing the unbuilt `@danwa/api-client` package. Any code importing `{ api }` from `$lib/api.js` gets an empty object with no methods. This is a time bomb — if a component calls `api.someMethod()`, it will get `TypeError: api.someMethod is not a function` at runtime.
- **The Fix:** Either remove the export and fix all importers to use `request()` directly, or implement the minimal facade methods that consumers actually need. The comment says "extend with typed methods as the studio grows" — but that growth should not happen on a `__placeholder` foundation.

### 3.2 Blueprint Store Uses `.svelte.js` Extension for Rune-Based State — [Architecture]

- **Location:** `src/lib/blueprint/store.svelte.js`
- **The Problem:** Svelte 5 runes (`$state`, `$derived`) in `.svelte.js` files are an unstable feature that requires the Svelte compiler to process the file. While Svelte 5 does support runes in `.svelte.js` modules, this couples the state layer to the Svelte build pipeline. If the studio ever needs to share state logic with a non-Svelte consumer (tests, SSR, Node scripts), this pattern won't work.
- **Recommendation:** This is acceptable for a Svelte-only SPA. Just be aware that unit-testing rune-based stores outside a Svelte component context requires the Svelte compiler in the test runner.

---

## 4. Performance & Resilience Optimizations (Nice to Have)

- **`isBackendReachable` called before every login/register:** `src/lib/api/auth.js:96,122` — Each auth attempt makes a separate `fetch('/health')` with a 2.5s timeout before the actual login request. This doubles the latency of login. Consider caching reachability for 30 seconds (a failed reachability check is unlikely to recover within seconds).

- **No SSE reconnection with exponential backoff:** `src/lib/workflowSSE.js` (if present) — ensure SSE clients implement exponential backoff reconnection to avoid thundering-herd reconnects when the backend restarts.

---

## 5. Clarifying Questions for the Author

1. **Is `getCurrentUserSync` actually called anywhere?** If route guards or components depend on it, authentication is silently broken. If nothing calls it, it's dead code that should be removed.
2. **Is dev-mode auth (`DANWA_AUTH_ENABLED=false`) the default in the Studio development environment?** If so, the missing `Authorization` header in `request()` is masked — the bug only manifests when auth is enabled.
3. **What is the plan for the `@danwa/api-client` package?** The comment says it's not built (`dist/` missing). Is the Studio meant to use the inline `request()` helper indefinitely, or is there a timeline for building the typed client?

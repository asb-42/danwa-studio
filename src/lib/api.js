// Danwa Studio API wrapper
// Provides local request() and a minimal api facade for blueprint
// API compatibility. The original import of @danwa/api-client has
// been removed because the danwa-core monorepo's api-client package
// has not been built (dist/ is missing) and the symlink in
// node_modules/@danwa/ is not followed by rolldown in production
// builds. Re-enable the re-export below after `pnpm build` (or
// equivalent) inside danwa-core/packages/api-client.

const BASE_URL = '/api/v1';

/**
 * Generic request function matching the danwa frontend pattern.
 * Used by blueprint API functions.
 */
export async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

/**
 * Minimal `api` facade. The full @danwa/api-client exposes 30+
 * generated methods; consumers in the studio currently only need
 * `api` to be importable. Replace with `export { api as api } from
 * '@danwa/api-client'` once the package is built.
 */
export const api = {
  // Marker object so `import { api } from '$lib/api.js'` keeps
  // working. Extend with typed methods as the studio grows.
  __placeholder: true,
};
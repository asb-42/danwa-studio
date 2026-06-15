// Danwa Studio API wrapper
// Re-exports @danwa/api-client and provides local request() for blueprint API compatibility

import { api as apiClient } from '@danwa/api-client';

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

// Re-export the typed API client
export { apiClient as api };
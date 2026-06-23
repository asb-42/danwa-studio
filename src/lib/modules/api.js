/**
 * Module Manager — API client functions.
 *
 * Follows the same request() pattern as lib/blueprint/api.js.
 * All endpoints are under /api/v1/modules.
 */

import { request } from '../api.js';

// ─── Discovery & Listing ───────────────────────────────────────────

/**
 * List all installed modules with DB status.
 * @param {{ category?: string }} [opts]
 * @returns {Promise<Array>}
 */
export function listModules({ category = null } = {}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  const qs = params.toString();
  return request(`/api/v1/modules/${qs ? `?${qs}` : ''}`);
}

/**
 * List modules available for installation from the official registry.
 * @returns {Promise<Array>}
 */
export function listAvailableModules() {
  return request('/api/v1/modules/available');
}

// ─── Repository Integration (danwa-modules) ─────────────────────────

/**
 * Fetch the module index from the danwa-modules GitHub repository.
 * @param {{ forceRefresh?: boolean }} [opts]
 * @returns {Promise<Array>}
 */
export function getRepoIndex({ forceRefresh = false } = {}) {
  return request(
    `/api/v1/modules/repo-index${forceRefresh ? '?force_refresh=true' : ''}`,
  );
}

/**
 * Check which installed modules have updates available.
 * @returns {Promise<Array>}
 */
export function checkRepoUpdates() {
  return request('/api/v1/modules/check-repo-updates');
}

// ─── Single Module ─────────────────────────────────────────────────

/**
 * Get detailed info about a specific module.
 * @param {string} moduleId
 * @returns {Promise<Object>}
 */
export function getModule(moduleId) {
  return request(`/api/v1/modules/${moduleId}`);
}

/**
 * Get the parsed profile data for a module, merged with manifest metadata.
 * @param {string} moduleId
 * @returns {Promise<Object>}
 */
export function getModuleProfile(moduleId) {
  return request(`/api/v1/modules/${moduleId}/profile`);
}

// ─── Mutations ─────────────────────────────────────────────────────

/**
 * Enable a module.
 * @param {string} moduleId
 * @returns {Promise<Object>}
 */
export function enableModule(moduleId) {
  return request(`/api/v1/modules/${moduleId}/enable`, { method: 'POST' });
}

/**
 * Disable a module.
 * @param {string} moduleId
 * @returns {Promise<Object>}
 */
export function disableModule(moduleId) {
  return request(`/api/v1/modules/${moduleId}/disable`, { method: 'POST' });
}

/**
 * Uninstall a module.
 * @param {string} moduleId
 * @returns {Promise<Object>}
 */
export function uninstallModule(moduleId) {
  return request(`/api/v1/modules/${moduleId}/uninstall`, { method: 'POST' });
}

/**
 * Install a module.
 * @param {string} moduleId
 * @param {{ version?: string, source?: string }} [opts]
 * @returns {Promise<Object>}
 */
export function installModule(moduleId, { version = null, source = null } = {}) {
  return request('/api/v1/modules/install', {
    method: 'POST',
    body: JSON.stringify({
      module_id: moduleId,
      version: version || undefined,
      source: source || undefined,
    }),
  });
}

/**
 * Update a module to a new version.
 * @param {string} moduleId
 * @param {string} version
 * @returns {Promise<Object>}
 */
export function updateModule(moduleId, version) {
  return request(`/api/v1/modules/${moduleId}/update`, {
    method: 'PUT',
    body: JSON.stringify({ version }),
  });
}

/**
 * Validate a module manifest.
 * @param {Object} manifest
 * @returns {Promise<Object>}
 */
export function validateModule(manifest) {
  return request('/api/v1/modules/validate', {
    method: 'POST',
    body: JSON.stringify(manifest),
  });
}

/**
 * Export a module as a ZIP pack.
 * @param {string} moduleId
 * @returns {Promise<Blob>}
 */
export function exportModule(moduleId) {
  return request(`/api/v1/modules/${moduleId}/export`, { method: 'POST' });
}

// ─── Profile write (Schema-Editor) ─────────────────────────────────

/**
 * Update the parsed profile data for a module.
 * @param {string} moduleId
 * @param {Object} data  The full profile data dict to persist.
 * @returns {Promise<{ status: string, module_id: string, profile: any }>}
 */
export function updateModuleProfile(moduleId, data) {
  return request(`/api/v1/modules/${encodeURIComponent(moduleId)}/profile`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}

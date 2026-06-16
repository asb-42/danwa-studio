/**
 * Module Publishing — API client functions.
 *
 * NOTE: Sprint 6 — the backend has no Git-publishing endpoint yet, so
 * this module wraps the existing building blocks (validate, export as
 * pack) and the PublishingView offers a CLI hand-off for the actual
 * `git commit && git push` step in danwa-modules.
 *
 * When a /modules/{id}/publish endpoint is added, only the bottom
 * helper needs to change.
 *
 * All endpoints are under /api/v1/modules.
 */

import { request } from '../api.js';

// ─── Validation ─────────────────────────────────────────────────────

/**
 * Validate a module manifest against the schema without installing it.
 * @param {Object} manifest  The full manifest.json contents as a dict.
 * @returns {Promise<{ module_id: string, valid: boolean, file_count: number, checksum_valid: boolean, issues: Array }>}
 */
export function validateModule(manifest) {
  return request('/api/v1/modules/validate', {
    method: 'POST',
    body: JSON.stringify({ manifest }),
  });
}

// ─── Export as pack (zip) ───────────────────────────────────────────

/**
 * Build a downloadable ZIP pack for a module.
 * @param {string} moduleId
 * @returns {Promise<Blob|string>}  Blob if the server returns binary; falls back to JSON if not.
 */
export async function exportModulePack(moduleId) {
  // We can't use the generic `request()` because it tries to JSON-parse
  // the response. For binary downloads we fetch directly.
  const BASE = '/api/v1';
  const res = await fetch(`${BASE}/modules/${encodeURIComponent(moduleId)}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.blob();
}

// ─── Local repo + update checks (read-only building blocks) ─────────

/**
 * Local modules with their DB state (install, enable, version, etc).
 * @returns {Promise<Array>}
 */
export function listLocalModules() {
  return request('/api/v1/modules/');
}

/**
 * Remote index from the danwa-modules GitHub repo.
 * @param {{ forceRefresh?: boolean }} [opts]
 * @returns {Promise<Array>}
 */
export function fetchRepoIndex({ forceRefresh = false } = {}) {
  return request(
    `/api/v1/modules/repo-index${forceRefresh ? '?force_refresh=true' : ''}`,
  );
}

/**
 * Compare local versions against the remote index; returns the list of
 * modules that have a newer version available upstream.
 * @returns {Promise<Array>}
 */
export function checkRepoUpdates() {
  return request('/api/v1/modules/check-repo-updates');
}

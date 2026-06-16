/**
 * LLM Catalog — API client functions.
 *
 * Wraps the four endpoints under /api/v1/catalog that the backend
 * exposes for fetching + importing LLM metadata from public GitHub-
 * hosted catalogs (currently charmbracelet/catwalk + agentjido/llm_db).
 *
 * See plans/2026-06-15_llm-catalog-integration.md for the full design.
 */

import { request } from '../api.js';

// ─── Sources ────────────────────────────────────────────────────────

/**
 * List configured catalog sources (catwalk, llm_db) with last-fetch
 * status. Each entry: { name, repo_url, branch, path, description,
 * last_fetch: { commit_sha, cloned, pulled, error, ... } | null }.
 * @returns {Promise<Array>}
 */
export function listCatalogSources() {
  return request('/api/v1/catalog/sources');
}

/**
 * Fetch (git clone or pull) one catalog source into the local cache.
 * @param {string} name
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<{ commit_sha: string, cloned: boolean, ... }>}
 */
export function fetchCatalogSource(name, { force = false } = {}) {
  return request(
    `/api/v1/catalog/sources/${encodeURIComponent(name)}/fetch` +
      (force ? '?force=true' : ''),
    { method: 'POST' },
  );
}

/**
 * Fetch (git clone or pull) every configured source in one call.
 * @returns {Promise<Array>}
 */
export function fetchAllCatalogSources() {
  return request('/api/v1/catalog/fetch-all', { method: 'POST' });
}

// ─── Catalog browse ───────────────────────────────────────────────

/**
 * Return the normalized catalog (in-memory after fetch).
 * @param {{ source?: string }} [opts]  Optional filter ("catwalk" | "llm_db").
 * @returns {Promise<{ sources: Array<{ name, model_count, models: Array }> }>}
 */
export function getCatalog({ source = null } = {}) {
  const qs = source ? `?source=${encodeURIComponent(source)}` : '';
  return request(`/api/v1/catalog/catalog${qs}`);
}

// ─── Import ────────────────────────────────────────────────────────

/**
 * Diff local llm-profiles/ against the catalog and (optionally) apply.
 * @param {{ dryRun?: boolean, sources?: string[] }} [opts]
 * @returns {Promise<{ entries, by_action, dry_run, ... }>}
 */
export function runCatalogImport({ dryRun = true, sources = null } = {}) {
  const params = new URLSearchParams({ dry_run: String(dryRun) });
  if (sources && sources.length) params.set('sources', sources.join(','));
  return request(`/api/v1/catalog/import?${params.toString()}`, {
    method: 'POST',
  });
}

/**
 * i18n Translation Dashboard — API client functions.
 *
 * Follows the same request() pattern as lib/blueprint/api.js and
 * lib/modules/api.js. All endpoints are under /api/v1/i18n.
 */

import { request } from '../api.js';

// ─── Locales ────────────────────────────────────────────────────────

/**
 * List all supported locales with metadata (code, name, is_rtl, coverage).
 * @returns {Promise<{ default_locale: string, locales: Array, rtl_locales: string[] }>}
 */
export function getSupportedLocales() {
  return request('/api/v1/i18n/locales');
}

/**
 * List custom-registered locales (added by users, not in the default set).
 * @returns {Promise<{ custom_locales: Array }>}
 */
export function getCustomLocales() {
  return request('/api/v1/i18n/custom-locales');
}

/**
 * Register a new custom locale.
 * @param {{ locale: string, name?: string, is_rtl?: boolean }} body
 * @returns {Promise<Object>}
 */
export function registerLocale({ locale, name = null, is_rtl = false }) {
  return request('/api/v1/i18n/locales', {
    method: 'POST',
    body: JSON.stringify({ locale, name, is_rtl }),
  });
}

// ─── Stats & Coverage ──────────────────────────────────────────────

/**
 * Translation stats per locale.
 * @param {{ namespace?: string }} [opts]
 * @returns {Promise<Object>}
 */
export function getTranslationStats({ namespace = 'global' } = {}) {
  return request(`/api/v1/i18n/stats?namespace=${encodeURIComponent(namespace)}`);
}

/**
 * Coverage report for all locales.
 * @param {{ namespace?: string }} [opts]
 * @returns {Promise<Object>}
 */
export function getTranslationCoverage({ namespace = 'global' } = {}) {
  return request(`/api/v1/i18n/coverage?namespace=${encodeURIComponent(namespace)}`);
}

// ─── Per-locale strings ────────────────────────────────────────────

/**
 * Get the full set of strings for one locale, with translation status + dates.
 * @param {string} locale
 * @param {{ namespace?: string }} [opts]
 * @returns {Promise<Object>}
 */
export function getLocaleStrings(locale, { namespace = 'global' } = {}) {
  return request(
    `/api/v1/i18n/strings/${encodeURIComponent(locale)}?namespace=${encodeURIComponent(namespace)}`,
  );
}

/**
 * Get a single string by locale + key.
 * @param {string} locale
 * @param {string} key
 * @param {{ namespace?: string }} [opts]
 * @returns {Promise<Object>}
 */
export function getString(locale, key, { namespace = 'global' } = {}) {
  return request(
    `/api/v1/i18n/${encodeURIComponent(locale)}/${encodeURIComponent(key)}?namespace=${encodeURIComponent(namespace)}`,
  );
}

/**
 * Create or update a single string.
 * @param {string} locale
 * @param {string} key
 * @param {string} value
 * @param {{ namespace?: string }} [opts]
 * @returns {Promise<Object>}
 */
export function setString(locale, key, value, { namespace = 'global' } = {}) {
  return request(
    `/api/v1/i18n/${encodeURIComponent(locale)}/${encodeURIComponent(key)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ value, namespace }),
    },
  );
}

/**
 * Delete a single string from a locale.
 * @param {string} locale
 * @param {string} key
 * @param {{ namespace?: string }} [opts]
 * @returns {Promise<void>}
 */
export function deleteString(locale, key, { namespace = 'global' } = {}) {
  return request(
    `/api/v1/i18n/${encodeURIComponent(locale)}/${encodeURIComponent(key)}?namespace=${encodeURIComponent(namespace)}`,
    { method: 'DELETE' },
  );
}

// ─── Bulk operations ───────────────────────────────────────────────

/**
 * Start an async bulk LLM-translation job.
 * @param {{ target_locales: string[], namespace?: string, force?: boolean, wipe_first?: boolean }} body
 * @returns {Promise<{ job_id: string }>}
 */
export function bulkTranslate({ target_locales, namespace = 'global', force = false, wipe_first = false }) {
  return request('/api/v1/i18n/bulk-translate', {
    method: 'POST',
    body: JSON.stringify({ target_locales, namespace, force, wipe_first }),
  });
}

/**
 * Poll a bulk-translate job's status.
 * @param {string} jobId
 * @returns {Promise<Object>}
 */
export function getBulkTranslateStatus(jobId) {
  return request(`/api/v1/i18n/bulk-translate/${encodeURIComponent(jobId)}/status`);
}

/**
 * List recent bulk-translate jobs.
 * @returns {Promise<Array>}
 */
export function listBulkTranslateJobs() {
  return request('/api/v1/i18n/bulk-translate');
}

/**
 * Wipe all translations for a locale (optionally scoped to namespace).
 * @param {string} locale
 * @param {{ namespace?: string }} [opts]
 * @returns {Promise<Object>}
 */
export function wipeLocale(locale, { namespace = 'global' } = {}) {
  return request(`/api/v1/i18n/${encodeURIComponent(locale)}/wipe`, {
    method: 'POST',
    body: JSON.stringify({ namespace }),
  });
}

/**
 * Export a locale as a downloadable translation pack.
 * @param {string} locale
 * @returns {Promise<Object>}
 */
export function exportLocaleAsPack(locale) {
  return request(`/api/v1/i18n/${encodeURIComponent(locale)}/export-as-pack`, {
    method: 'POST',
  });
}

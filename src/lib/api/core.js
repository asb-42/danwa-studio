/**
 * core.js — Thin facade for src/lib/api.js (request() + api).
 *
 * Why this file exists:
 *   src/lib/api/module.js imports { request } from './core.js' but
 *   the real implementation lives in src/lib/api.js (which is the
 *   wrapper consumed by the rest of the studio — see api.js for the
 *   full request() definition with @danwa/api-client wiring).
 *
 * Pre-existing repo state: src/lib/api/core.js was referenced but not
 * committed. This stub re-exports from the canonical api.js so the
 * build resolves and module.js (and any other consumer) get the same
 * request() they would have gotten.
 *
 * If you need a different request() implementation for module routes
 * specifically (e.g. different BASE_URL or extra auth header), add it
 * here and re-export as `moduleRequest` — do NOT duplicate request().
 */

// Re-export the shared fetch wrapper and the typed client.
// eslint-disable-next-line no-unused-vars
export { request, api } from '../api.js';
export { request as default } from '../api.js';

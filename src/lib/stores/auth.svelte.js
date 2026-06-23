/**
 * stores/auth.svelte.js — STUB (pre-existing repo state: missing).
 *
 * Referenced by src/components/blueprint/RunWorkflowDialog.svelte
 * but never committed. Should expose a Svelte 5 rune-based store
 * that returns the currently authenticated tenant and user.
 *
 * Public surface (from caller):
 *   currentTenant  — a rune-state-like object with a `.value` getter
 *
 * This stub throws on access so the build resolves and a future
 * developer is alerted that real auth wiring is required.
 *
 * See ADR-045 (planned) and the danwa-core `/api/v1/auth/whoami`
 * endpoint when implementing.
 */

export const currentTenant = {
  get value() {
    throw new Error(
      'currentTenant.value is a stub — see src/lib/stores/auth.svelte.js',
    );
  },
};

export default { currentTenant };

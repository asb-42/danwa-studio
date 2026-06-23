/**
 * api/case.js — STUB (pre-existing repo state: missing).
 *
 * Referenced by src/components/blueprint/RunWorkflowDialog.svelte
 * but never committed.
 *
 * Public surface (from caller):
 *   getCaseDocuments(caseId) -> Promise<Array<...>>
 *
 * Real implementation should hit danwa-core's
 *   /api/v1/tenants/{tid}/cases/{cid}/documents/
 * endpoint.
 */

export async function getCaseDocuments(caseId) {
  throw new Error(
    `getCaseDocuments(${JSON.stringify(caseId)}) is a stub — ` +
    'see src/lib/api/case.js',
  );
}

export default { getCaseDocuments };

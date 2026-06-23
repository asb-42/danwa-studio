/**
 * workflowSSE.js — STUB (pre-existing repo state: missing).
 *
 * Server-Sent Events wrapper for the workflow execution API.
 * Referenced by src/components/blueprint/ExecutionPanel.svelte and
 * src/components/blueprint/DebateExecutionDisplay.svelte as
 * '../../lib/workflowSSE.js' but never committed.
 *
 * Call site (from ExecutionPanel.svelte:112):
 *     cleanupSSE = createWorkflowSSE(sid, { ...callbacks });
 *
 * Public surface:
 *     createWorkflowSSE(sessionId, callbacks) -> () => void  (close fn)
 *
 * This stub preserves the public surface so the build resolves.
 * Calling it throws a clear runtime error so a future developer
 * knows immediately that real SSE wiring is required.
 *
 * When implementing: see danwa-core's `backend/api/routers/...` for
 * the `/api/v1/workflow-exec/sessions/{id}/report/stream` endpoint
 * and add an EventSource-based implementation here.
 */

export function createWorkflowSSE(sessionId, callbacks) {
  throw new Error(
    `createWorkflowSSE(${JSON.stringify(sessionId)}, ...) is a stub — ` +
    'see src/lib/workflowSSE.js',
  );
  // Suppress unused-arg warnings while still being a runtime failure.
  // eslint-disable-next-line no-unreachable
  void callbacks;
}

export default { createWorkflowSSE };

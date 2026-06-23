/**
 * transcriptNormalizer.js — STUB (pre-existing repo state: missing).
 *
 * Referenced by src/components/blueprint/ExecutionPanel.svelte and
 * src/components/blueprint/DebateExecutionDisplay.svelte but never
 * committed. Normalizes raw transcript content (e.g. markdown for
 * LLM nodes, plain text for human nodes) into a render-ready string.
 *
 * Public surface (from caller):
 *   normalizeTranscriptContent(content, role) -> string
 *
 * The call site does:
 *   const normalized = normalizeTranscriptContent(
 *     data.content || '',
 *     data.role || data.node_type || '',
 *   );
 *
 * Return the input unchanged for now so existing code paths still
 * render; a future commit can add the real normalization logic.
 */

export function normalizeTranscriptContent(content, role) {
  // Minimal passthrough so the build resolves and existing UI keeps
  // working. Replace with real markdown/role-aware normalization in a
  // follow-up commit. See src/lib/transcriptNormalizer.js.
  return String(content ?? '');
}

export default { normalizeTranscriptContent };

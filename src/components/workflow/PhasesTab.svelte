<!--
  PhasesTab.svelte — STUB (pre-existing repo state: missing).

  Referenced by src/components/blueprint/ExecutionPanel.svelte as
    import PhasesTab from '../workflow/PhasesTab.svelte';
  and used as:
    <PhasesTab {sessionId} />

  This stub renders a placeholder so the build resolves and the
  existing UI continues to work. Replace with a real phase-timeline
  component that consumes the
  /api/v1/workflow_exec/{session_id}/phase-snapshots endpoints
  shipped in commit 2a47340 (see
  plans/2026-06-22_repo-setup-orchestration.md §1.3 and the
  "Phase 5" plan notes).
-->
<script>
  let { sessionId } = $props();
</script>

<section class="p-4 border-t border-gray-200 dark:border-gray-700 text-sm">
  <h3 class="font-semibold mb-2">Phase timeline</h3>
  <p class="text-gray-500 dark:text-gray-400">
    PhasesTab is a stub — session <code>{sessionId}</code>.
    Real phase-snapshot timeline coming in a follow-up commit.
  </p>
</section>

<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import {
    listProposals,
    getProposal,
    approveProposal,
    rejectProposal,
    reflectOnWorkflow,
  } from '../lib/proposals/api.js';
  import { listWorkflowSessions } from '../lib/workflowExec.js';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  let t = $derived((key, params) => $i18n.t(key, params));

  let proposals = $state([]);
  let loading = $state(false);
  let statusFilter = $state('all');
  let expandingId = $state(null);
  let expandedProposal = $state(null);
  let pendingAction = $state(null); // { kind: 'approve'|'reject', id }
  let acting = $state(false);

  // Reflect (generate new proposal) form
  let showReflectForm = $state(false);
  let reflectWorkflowId = $state('');
  let recentSessions = $state([]);
  let reflecting = $state(false);

  onMount(loadProposals);

  async function loadProposals() {
    loading = true;
    try {
      const filter = statusFilter === 'all' ? {} : { status: statusFilter };
      proposals = await listProposals({ ...filter, limit: 100 });
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loading = false;
    }
  }

  async function loadRecentSessions() {
    try {
      recentSessions = await listWorkflowSessions({ status: 'completed', limit: 50 });
    } catch {
      recentSessions = [];
    }
  }

  async function toggleExpand(p) {
    if (expandingId === p.proposal_id) {
      expandingId = null;
      expandedProposal = null;
      return;
    }
    expandingId = p.proposal_id;
    expandedProposal = null;
    try {
      expandedProposal = await getProposal(p.proposal_id);
    } catch (e) {
      errorStore.set(e.message);
    }
  }

  function askApprove(p) { pendingAction = { kind: 'approve', id: p.proposal_id, title: p.target_workflow_id }; }
  function askReject(p) { pendingAction = { kind: 'reject', id: p.proposal_id, title: p.target_workflow_id }; }

  async function confirmAction() {
    if (!pendingAction) return;
    const { kind, id } = pendingAction;
    pendingAction = null;
    acting = true;
    try {
      if (kind === 'approve') await approveProposal(id);
      else await rejectProposal(id);
      if (expandingId === id) { expandingId = null; expandedProposal = null; }
      await loadProposals();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      acting = false;
    }
  }

  function openReflect() {
    showReflectForm = true;
    if (recentSessions.length === 0) loadRecentSessions();
  }

  async function handleReflect() {
    if (!reflectWorkflowId.trim()) {
      errorStore.set('workflow_id is required');
      return;
    }
    reflecting = true;
    try {
      const resp = await reflectOnWorkflow(reflectWorkflowId.trim());
      showReflectForm = false;
      reflectWorkflowId = '';
      errorStore.set(`Proposal ${resp.proposal_id} created (status=${resp.status})`);
      await loadProposals();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      reflecting = false;
    }
  }

  function statusBadge(s) {
    if (s === 'approved') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    if (s === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (s === 'pending') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    if (s === 'applied') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{$i18n.t('nav.proposals')}</h1>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        HITL review of meta-agent-generated workflow optimisations.
      </p>
    </div>
    <div class="flex gap-2">
      <button class="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm" onclick={loadProposals}>
        Refresh
      </button>
      <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onclick={openReflect}>
        + Reflect on Workflow
      </button>
    </div>
  </div>

  {#if showReflectForm}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Trigger meta-agent reflection</h2>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Generates a new proposal by reflecting on the workflow's execution history.
      </p>
      <div class="form-field">
        <label class="field-label" for="reflect-wf">Workflow ID</label>
        <input id="reflect-wf" type="text" class="field-input" bind:value={reflectWorkflowId} list="recent-wf" placeholder="e.g. 3-phase-debate" />
        <datalist id="recent-wf">
          {#each recentSessions as s (s.workflow_id)}
            {#if s.workflow_id}<option value={s.workflow_id}></option>{/if}
          {/each}
        </datalist>
      </div>
      <div class="flex justify-end gap-2">
        <button class="btn-secondary" onclick={() => (showReflectForm = false)}>Cancel</button>
        <button class="btn-primary" onclick={handleReflect} disabled={reflecting}>
          {reflecting ? 'Reflecting…' : 'Generate Proposal'}
        </button>
      </div>
    </div>
  {/if}

  <div class="flex items-center gap-2 text-sm">
    <label class="text-xs text-gray-600 dark:text-gray-400" for="prop-status">Status</label>
    <select id="prop-status" class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700" bind:value={statusFilter} onchange={loadProposals}>
      <option value="all">all</option>
      <option value="pending">pending</option>
      <option value="approved">approved</option>
      <option value="rejected">rejected</option>
      <option value="applied">applied</option>
    </select>
    <span class="text-xs text-gray-500 ml-2">{proposals.length} proposal(s)</span>
  </div>

  {#if loading}
    <p class="text-gray-500 text-sm">{$i18n.t('common.loading')}</p>
  {:else if proposals.length === 0}
    <p class="text-gray-500 text-sm">No proposals yet. Trigger a reflection to generate one.</p>
  {:else}
    <div class="space-y-2">
      {#each proposals as p (p.proposal_id)}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div class="p-4 flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2">
                <code class="font-mono text-xs text-gray-500 dark:text-gray-400">{p.proposal_id}</code>
                <span class="text-xs px-2 py-0.5 rounded-full {statusBadge(p.status)}">{p.status}</span>
              </div>
              <div class="text-sm font-medium text-gray-900 dark:text-white mt-1">
                Target workflow: <code class="font-mono">{p.target_workflow_id}</code>
              </div>
              {#if p.summary}
                <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">{p.summary}</div>
              {/if}
            </div>
            <div class="flex gap-2 items-center">
              <button class="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded" onclick={() => toggleExpand(p)}>
                {expandingId === p.proposal_id ? 'Close' : 'Details'}
              </button>
              {#if p.status === 'pending'}
                <button class="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50" disabled={acting} onclick={() => askApprove(p)}>Approve</button>
                <button class="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50" disabled={acting} onclick={() => askReject(p)}>Reject</button>
              {/if}
            </div>
          </div>

          {#if expandingId === p.proposal_id}
            <div class="border-t border-gray-200 dark:border-gray-700 p-4">
              {#if !expandedProposal}
                <p class="text-gray-500 text-sm">Loading…</p>
              {:else}
                <pre class="json-block">{JSON.stringify(expandedProposal, null, 2)}</pre>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<ConfirmDialog
  open={pendingAction !== null}
  title={pendingAction?.kind === 'approve' ? 'Approve proposal' : 'Reject proposal'}
  message={pendingAction ? `${pendingAction.kind === 'approve' ? 'Apply' : 'Discard'} proposal ${pendingAction.id.slice(0, 12)}… for ${pendingAction.title}?` : ''}
  confirmLabel={pendingAction?.kind === 'approve' ? 'Approve' : 'Reject'}
  cancelLabel={$i18n.t('common.cancel')}
  variant={pendingAction?.kind === 'approve' ? 'primary' : 'danger'}
  onConfirm={confirmAction}
  onCancel={() => (pendingAction = null)}
/>

<style>
  .form-field { display: flex; flex-direction: column; gap: 4px; }
  .field-label { font-size: 0.8rem; font-weight: 500; color: var(--color-text, #cdd6f4); }
  .field-input {
    padding: 8px 12px; border: 1px solid var(--color-border, #313244); border-radius: 6px;
    background: var(--color-surface, #313244); color: var(--color-text, #cdd6f4);
    font-size: 0.875rem; font-family: inherit;
  }
  .field-input:focus { outline: none; border-color: var(--color-primary, #89b4fa); }
  .btn-primary {
    padding: 8px 16px; border: none; border-radius: 6px;
    background: var(--color-primary, #89b4fa); color: var(--color-bg, #1e1e2e);
    font-size: 0.875rem; font-weight: 600; cursor: pointer;
  }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary {
    padding: 8px 16px; border: 1px solid var(--color-border, #313244); border-radius: 6px;
    background: transparent; color: var(--color-text-muted, #6c7086);
    font-size: 0.875rem; cursor: pointer;
  }
  .json-block {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--color-border, #313244);
    border-radius: 6px;
    padding: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--color-text, #cdd6f4);
    overflow-x: auto;
    white-space: pre;
    margin: 0;
    max-height: 400px;
    overflow-y: auto;
  }
</style>

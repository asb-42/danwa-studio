<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount, onDestroy } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import {
    listWorkflowSessions,
    startWorkflow,
    getWorkflowState,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,
    submitInterjection,
    getPhaseSnapshots,
  } from '../lib/workflowExec.js';

  let t = $derived((key, params) => $i18n.t(key, params));

  // Sessions list
  let sessions = $state([]);
  let loadingSessions = $state(false);
  let statusFilter = $state('all');

  // Start form
  let showStartForm = $state(false);
  let startWorkflowId = $state('');
  let startContext = $state('');
  let startLanguage = $state('de');
  let startMaxRounds = $state(10);
  let starting = $state(false);

  // Active session
  let activeSessionId = $state(null);
  let activeState = $state(null);
  let statePoller = null;
  let interjectionText = $state('');
  let submittingInterject = $state(false);
  let phaseSnapshots = $state([]);

  onMount(loadSessions);
  onDestroy(() => stopPolling());

  async function loadSessions() {
    loadingSessions = true;
    try {
      const filter = statusFilter === 'all' ? {} : { status: statusFilter };
      sessions = await listWorkflowSessions({ ...filter, limit: 100 });
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loadingSessions = false;
    }
  }

  async function handleStart() {
    if (!startWorkflowId.trim() || !startContext.trim()) {
      errorStore.set('workflow_id and context are required');
      return;
    }
    starting = true;
    try {
      const resp = await startWorkflow(startWorkflowId.trim(), startContext.trim(), {
        language: startLanguage,
        maxRounds: startMaxRounds,
      });
      activeSessionId = resp.session_id;
      showStartForm = false;
      startContext = '';
      await loadSessions();
      startPolling();
      await loadStateOnce();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      starting = false;
    }
  }

  function startPolling() {
    stopPolling();
    statePoller = setInterval(loadStateOnce, 2000);
  }
  function stopPolling() {
    if (statePoller) clearInterval(statePoller);
    statePoller = null;
  }

  async function loadStateOnce() {
    if (!activeSessionId) return;
    try {
      activeState = await getWorkflowState(activeSessionId);
      try {
        phaseSnapshots = await getPhaseSnapshots(activeSessionId);
      } catch {
        phaseSnapshots = [];
      }
      if (['completed', 'failed', 'cancelled'].includes(activeState?.status)) {
        stopPolling();
        await loadSessions();
      }
    } catch (e) {
      // Soft-fail (network blip)
      console.warn('state poll error', e.message);
    }
  }

  async function handlePause() {
    if (!activeSessionId) return;
    try { await pauseWorkflow(activeSessionId); await loadStateOnce(); } catch (e) { errorStore.set(e.message); }
  }
  async function handleResume() {
    if (!activeSessionId) return;
    try { await resumeWorkflow(activeSessionId); await loadStateOnce(); } catch (e) { errorStore.set(e.message); }
  }
  async function handleCancel() {
    if (!activeSessionId) return;
    if (!confirm('Cancel this workflow session?')) return;
    try { await cancelWorkflow(activeSessionId); await loadStateOnce(); } catch (e) { errorStore.set(e.message); }
  }

  async function handleInterject() {
    if (!activeSessionId || !interjectionText.trim()) return;
    submittingInterject = true;
    try {
      await submitInterjection(activeSessionId, interjectionText.trim());
      interjectionText = '';
      await loadStateOnce();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      submittingInterject = false;
    }
  }

  function openSession(id) {
    activeSessionId = id;
    startPolling();
    loadStateOnce();
  }

  function closeSession() {
    stopPolling();
    activeSessionId = null;
    activeState = null;
    phaseSnapshots = [];
  }

  function statusColor(status) {
    if (!status) return 'bg-gray-400';
    if (status === 'running') return 'bg-blue-500 animate-pulse';
    if (status === 'completed') return 'bg-green-500';
    if (status === 'paused') return 'bg-yellow-500';
    if (status === 'failed' || status === 'cancelled') return 'bg-red-500';
    return 'bg-gray-400';
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{$i18n.t('nav.exec')}</h1>
    <div class="flex gap-2">
      <button class="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600" onclick={loadSessions}>
        Refresh
      </button>
      <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onclick={() => (showStartForm = !showStartForm)}>
        {showStartForm ? 'Close' : '+ New Workflow'}
      </button>
    </div>
  </div>

  {#if showStartForm}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Start new workflow</h2>
      <div class="grid grid-cols-2 gap-3">
        <div class="form-field">
          <label class="field-label" for="wf-id">Workflow ID</label>
          <input id="wf-id" type="text" class="field-input" bind:value={startWorkflowId} placeholder="e.g. 3-phase-debate" />
        </div>
        <div class="form-field">
          <label class="field-label" for="wf-lang">Language</label>
          <input id="wf-lang" type="text" class="field-input" bind:value={startLanguage} maxlength="8" />
        </div>
      </div>
      <div class="form-field">
        <label class="field-label" for="wf-ctx">Context / Topic</label>
        <textarea id="wf-ctx" class="field-input" rows="3" bind:value={startContext} placeholder="What should the agents debate?"></textarea>
      </div>
      <div class="form-field">
        <label class="field-label" for="wf-rounds">Max Rounds: {startMaxRounds}</label>
        <input id="wf-rounds" type="range" min="1" max="20" class="field-range" bind:value={startMaxRounds} />
      </div>
      <div class="flex justify-end gap-2">
        <button class="btn-secondary" onclick={() => (showStartForm = false)}>Cancel</button>
        <button class="btn-primary" onclick={handleStart} disabled={starting}>
          {starting ? 'Starting…' : 'Start Workflow'}
        </button>
      </div>
    </div>
  {/if}

  <!-- Active session panel -->
  {#if activeSessionId && activeState}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border-2 border-blue-400 dark:border-blue-600 p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span class="inline-block w-3 h-3 rounded-full {statusColor(activeState.status)}"></span>
            Active Session
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
            {activeSessionId} · {activeState.workflow_id || '—'} · Round {activeState.current_round ?? 0}
          </p>
        </div>
        <div class="flex gap-2">
          {#if activeState.status === 'running'}
            <button class="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm" onclick={handlePause}>⏸ Pause</button>
          {:else if activeState.status === 'paused'}
            <button class="px-3 py-1.5 bg-green-600 text-white rounded text-sm" onclick={handleResume}>▶ Resume</button>
          {/if}
          {#if !['completed', 'cancelled'].includes(activeState.status)}
            <button class="px-3 py-1.5 bg-red-500 text-white rounded text-sm" onclick={handleCancel}>✕ Cancel</button>
          {/if}
          <button class="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm" onclick={closeSession}>Close</button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 text-sm">
        <div class="kv-card">
          <div class="kv-label">Status</div>
          <div class="kv-value font-mono">{activeState.status}</div>
        </div>
        <div class="kv-card">
          <div class="kv-label">Current Node</div>
          <div class="kv-value font-mono">{activeState.current_node_id || '—'}</div>
        </div>
        <div class="kv-card">
          <div class="kv-label">Consensus</div>
          <div class="kv-value font-mono">{activeState.final_consensus?.toFixed(2) ?? '—'}</div>
        </div>
      </div>

      <!-- HITL: interjection input -->
      {#if activeState.status === 'running' || activeState.status === 'paused'}
        <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
          <h3 class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase">HITL Interjection</h3>
          <div class="flex gap-2">
            <input class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm" bind:value={interjectionText} placeholder="Inject user input into the running workflow…" />
            <button class="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50" onclick={handleInterject} disabled={!interjectionText.trim() || submittingInterject}>
              {submittingInterject ? '…' : 'Send'}
            </button>
          </div>
        </div>
      {/if}

      <!-- Phase snapshots -->
      {#if phaseSnapshots.length}
        <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
          <h3 class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase">Phase Snapshots ({phaseSnapshots.length})</h3>
          <ul class="text-xs space-y-1 font-mono max-h-32 overflow-y-auto">
            {#each phaseSnapshots as snap (snap.node_id || snap.id)}
              <li class="text-gray-600 dark:text-gray-400">
                {snap.node_id || snap.id} · {snap.timestamp || snap.created_at || '—'}
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Node outputs (tail) -->
      {#if activeState.node_outputs && activeState.node_outputs.length}
        <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
          <h3 class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase">Node Outputs</h3>
          <div class="text-xs max-h-40 overflow-y-auto space-y-1 font-mono">
            {#each activeState.node_outputs.slice(-5) as out, i (i)}
              <div class="text-gray-600 dark:text-gray-400">
                [{out.node_id || out.role || i}] {out.output ? out.output.slice(0, 100) + (out.output.length > 100 ? '…' : '') : ''}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Sessions list -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white">All Sessions</h2>
      <select class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700" bind:value={statusFilter} onchange={loadSessions}>
        <option value="all">all</option>
        <option value="running">running</option>
        <option value="paused">paused</option>
        <option value="completed">completed</option>
        <option value="failed">failed</option>
        <option value="cancelled">cancelled</option>
      </select>
    </div>
    {#if loadingSessions}
      <div class="p-8 text-center text-gray-500">{$i18n.t('common.loading')}</div>
    {:else if sessions.length === 0}
      <div class="p-8 text-center text-gray-500">{$i18n.t('common.noData')}</div>
    {:else}
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-4 py-2">Session ID</th>
            <th class="px-4 py-2">Workflow</th>
            <th class="px-4 py-2">Status</th>
            <th class="px-4 py-2">Round</th>
            <th class="px-4 py-2">Created</th>
            <th class="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each sessions as s (s.session_id || s.id)}
            <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td class="px-4 py-2 font-mono text-xs">{s.session_id || s.id}</td>
              <td class="px-4 py-2 font-mono text-xs text-gray-500">{s.workflow_id || '—'}</td>
              <td class="px-4 py-2">
                <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 inline-flex items-center gap-1">
                  <span class="inline-block w-1.5 h-1.5 rounded-full {statusColor(s.status)}"></span>
                  {s.status}
                </span>
              </td>
              <td class="px-4 py-2 font-mono text-xs">{s.current_round ?? 0}</td>
              <td class="px-4 py-2 text-xs text-gray-500">{s.created_at ? new Date(s.created_at).toLocaleString() : '—'}</td>
              <td class="px-4 py-2 text-right">
                <button class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded" onclick={() => openSession(s.session_id || s.id)}>Open</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

<style>
  .form-field { display: flex; flex-direction: column; gap: 4px; }
  .field-label { font-size: 0.8rem; font-weight: 500; color: var(--color-text, #cdd6f4); }
  .field-input, .field-range {
    padding: 8px 12px; border: 1px solid var(--color-border, #313244); border-radius: 6px;
    background: var(--color-surface, #313244); color: var(--color-text, #cdd6f4);
    font-size: 0.875rem; font-family: inherit;
  }
  .field-input:focus { outline: none; border-color: var(--color-primary, #89b4fa); }
  .field-range { padding: 0; accent-color: var(--color-primary, #89b4fa); }
  .kv-card {
    background: rgba(137, 180, 250, 0.05);
    border: 1px solid var(--color-border, #313244);
    border-radius: 6px;
    padding: 8px 10px;
  }
  .kv-label { font-size: 0.7rem; color: var(--color-text-muted, #6c7086); text-transform: uppercase; }
  .kv-value { font-size: 0.95rem; color: var(--color-text, #cdd6f4); margin-top: 2px; }
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
</style>

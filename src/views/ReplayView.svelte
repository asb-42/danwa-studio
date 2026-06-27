<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount, onDestroy } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import { listWorkflowSessions, getAuditLog } from '../lib/workflowExec.js';

  let t = $derived((key, params) => i18n.t(key, params));

  let sessions = $state([]);
  let selectedSessionId = $state('');
  let auditLog = $state([]);
  let currentStep = $state(0);
  let isPlaying = $state(false);
  let playSpeed = $state(1); // 0.5, 1, 2, 4
  let playInterval = null;
  let loading = $state(false);
  let loadingSessions = $state(false);

  onMount(loadSessions);
  onDestroy(stopPlayback);

  async function loadSessions() {
    loadingSessions = true;
    try {
      sessions = await listWorkflowSessions({ status: 'completed', limit: 100 });
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loadingSessions = false;
    }
  }

  async function loadSession(id) {
    if (!id) {
      auditLog = [];
      currentStep = 0;
      return;
    }
    loading = true;
    try {
      auditLog = await getAuditLog(id, { limit: 2000 });
      currentStep = 0;
    } catch (e) {
      errorStore.set(e.message);
      auditLog = [];
    } finally {
      loading = false;
    }
  }

  function onSessionChange(e) {
    selectedSessionId = e.target.value;
    stopPlayback();
    loadSession(selectedSessionId);
  }

  function startPlayback() {
    if (currentStep >= auditLog.length - 1) currentStep = 0;
    isPlaying = true;
    const intervalMs = Math.max(150, 1000 / playSpeed);
    playInterval = setInterval(() => {
      if (currentStep >= auditLog.length - 1) {
        stopPlayback();
      } else {
        currentStep += 1;
      }
    }, intervalMs);
  }

  function stopPlayback() {
    if (playInterval) clearInterval(playInterval);
    playInterval = null;
    isPlaying = false;
  }

  function togglePlay() {
    if (isPlaying) stopPlayback();
    else startPlayback();
  }

  function stepBack() {
    stopPlayback();
    currentStep = Math.max(0, currentStep - 1);
  }
  function stepForward() {
    stopPlayback();
    currentStep = Math.min(auditLog.length - 1, currentStep + 1);
  }
  function jumpStart() {
    stopPlayback();
    currentStep = 0;
  }
  function jumpEnd() {
    stopPlayback();
    currentStep = auditLog.length - 1;
  }

  let currentEvent = $derived(auditLog[currentStep] || null);
  let eventCounts = $derived.by(() => {
    const counts = {};
    for (const e of auditLog) {
      const t = e.event_type || 'unknown';
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  });
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{i18n.t('nav.replay')}</h1>
    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
      Step through a completed workflow's audit log timeline.
    </p>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-3">
    <label class="text-xs text-gray-600 dark:text-gray-400" for="replay-session">Session</label>
    <select id="replay-session" class="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm" value={selectedSessionId} onchange={onSessionChange}>
      <option value="">— pick a completed session —</option>
      {#each sessions as s (s.session_id || s.id)}
        <option value={s.session_id || s.id}>
          {s.workflow_id || '—'} · {(s.session_id || s.id).slice(0, 12)}… · {s.created_at?.slice(0, 10) || ''}
        </option>
      {/each}
    </select>
  </div>

  {#if loading}
    <p class="text-gray-500 dark:text-gray-400 text-sm">{i18n.t('common.loading')}</p>
  {:else if auditLog.length > 0}
    <!-- Event type breakdown -->
    <div class="flex flex-wrap gap-2 text-xs">
      {#each Object.entries(eventCounts) as [etype, count] (etype)}
        <span class="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          {etype} · {count}
        </span>
      {/each}
    </div>

    <!-- Playback controls -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div class="flex items-center gap-2">
        <button class="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm" onclick={jumpStart} title="Jump to start">⏮</button>
        <button class="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm" onclick={stepBack} title="Step back">⏪</button>
        <button class="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-semibold" onclick={togglePlay}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button class="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm" onclick={stepForward} title="Step forward">⏩</button>
        <button class="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm" onclick={jumpEnd} title="Jump to end">⏭</button>

        <div class="ml-auto flex items-center gap-2 text-xs">
          <span class="text-gray-500 dark:text-gray-400">Speed</span>
          <select class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" bind:value={playSpeed} onchange={() => { if (isPlaying) { stopPlayback(); startPlayback(); } }}>
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
          </select>
          <span class="font-mono text-gray-500 dark:text-gray-400">{currentStep + 1} / {auditLog.length}</span>
        </div>
      </div>

      <!-- Timeline scrubber -->
      <input type="range" min="0" max={Math.max(0, auditLog.length - 1)} bind:value={currentStep} class="w-full accent-blue-500" />
    </div>

    <!-- Event list (left) + detail (right) -->
    <div class="grid grid-cols-3 gap-3">
      <div class="col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
        <table class="w-full text-sm">
          <tbody>
            {#each auditLog as ev, i (i)}
              <tr class="border-b dark:border-gray-700 cursor-pointer {i === currentStep ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}" onclick={() => { stopPlayback(); currentStep = i; }}>
                <td class="px-2 py-1 font-mono text-xs text-gray-400 dark:text-gray-500 w-10 text-right">{i + 1}</td>
                <td class="px-2 py-1">
                  <div class="text-xs font-semibold">{ev.event_type || '—'}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">{ev.node_id || ev.role || '—'}</div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
        {#if currentEvent}
          <h3 class="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
            Event #{currentStep + 1}: {currentEvent.event_type || '—'}
            {#if currentEvent.node_id}<span class="ml-2 text-xs text-gray-500 dark:text-gray-400 font-mono">{currentEvent.node_id}</span>{/if}
          </h3>
          <div class="grid grid-cols-2 gap-2 text-xs mb-3">
            {#if currentEvent.timestamp}
              <div><span class="text-gray-500 dark:text-gray-400">Time:</span> <span class="font-mono">{currentEvent.timestamp}</span></div>
            {/if}
            {#if currentEvent.actor}
              <div><span class="text-gray-500 dark:text-gray-400">Actor:</span> <span class="font-mono">{currentEvent.actor}</span></div>
            {/if}
            {#if currentEvent.round != null}
              <div><span class="text-gray-500 dark:text-gray-400">Round:</span> <span class="font-mono">{currentEvent.round}</span></div>
            {/if}
            {#if currentEvent.status}
              <div><span class="text-gray-500 dark:text-gray-400">Status:</span> <span class="font-mono">{currentEvent.status}</span></div>
            {/if}
          </div>
          {#if currentEvent.output || currentEvent.input || currentEvent.metadata}
            <pre class="json-block">{JSON.stringify({ output: currentEvent.output, input: currentEvent.input, metadata: currentEvent.metadata }, null, 2)}</pre>
          {/if}
        {:else}
          <p class="text-gray-500 dark:text-gray-400 text-sm">No event at this position.</p>
        {/if}
      </div>
    </div>
  {:else if selectedSessionId}
    <p class="text-gray-500 dark:text-gray-400 text-sm">No audit log entries for this session.</p>
  {:else if !loadingSessions && sessions.length === 0}
    <p class="text-gray-500 dark:text-gray-400 text-sm">No completed sessions available. Run a workflow first.</p>
  {/if}
</div>

<style>
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
    white-space: pre-wrap;
    margin: 0;
    max-height: 400px;
    overflow-y: auto;
  }
</style>

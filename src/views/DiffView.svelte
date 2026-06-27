<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import { listWorkflowSessions, getAuditLog } from '../lib/workflowExec.js';

  let t = $derived((key, params) => i18n.t(key, params));

  let sessions = $state([]);
  let sessionA = $state('');
  let sessionB = $state('');
  let auditLogA = $state([]);
  let auditLogB = $state([]);
  let loading = $state(false);
  let loadingSessions = $state(false);
  let selectedNodeId = $state(null);

  onMount(loadSessions);

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

  async function loadDiff() {
    if (!sessionA || !sessionB) return;
    loading = true;
    try {
      [auditLogA, auditLogB] = await Promise.all([
        getAuditLog(sessionA, { limit: 1000 }),
        getAuditLog(sessionB, { limit: 1000 }),
      ]);
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loading = false;
    }
  }

  function onSessionAChange(e) {
    sessionA = e.target.value;
    if (sessionA && sessionB) loadDiff();
  }
  function onSessionBChange(e) {
    sessionB = e.target.value;
    if (sessionA && sessionB) loadDiff();
  }

  // Build per-node pairs (only entries with a node_id)
  let diffPairs = $derived.by(() => {
    const mapA = new Map(auditLogA.filter((e) => e.node_id).map((e) => [e.node_id, e]));
    const mapB = new Map(auditLogB.filter((e) => e.node_id).map((e) => [e.node_id, e]));
    const ids = new Set([...mapA.keys(), ...mapB.keys()]);
    return [...ids].sort().map((nodeId) => ({
      nodeId,
      entryA: mapA.get(nodeId) || null,
      entryB: mapB.get(nodeId) || null,
    }));
  });

  function statusForPair(pair) {
    if (pair.entryA && pair.entryB) {
      const oA = pair.entryA.output || '';
      const oB = pair.entryB.output || '';
      if (oA === oB) return 'same';
      return 'differs';
    }
    if (pair.entryA) return 'only-a';
    return 'only-b';
  }

  function truncate(s, n = 200) {
    if (!s) return '';
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  let selectedPair = $derived(selectedNodeId ? diffPairs.find((p) => p.nodeId === selectedNodeId) : null);
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{i18n.t('nav.diff')}</h1>
    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
      Compare two completed workflow sessions node-by-node via their audit logs.
    </p>
  </div>

  <!-- Session selectors -->
  <div class="grid grid-cols-2 gap-3">
    <div>
      <label class="text-xs text-gray-600 dark:text-gray-400" for="diff-a">Session A</label>
      <select id="diff-a" class="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" value={sessionA} onchange={onSessionAChange}>
        <option value="">— pick —</option>
        {#each sessions as s (s.session_id || s.id)}
          <option value={s.session_id || s.id}>
            {s.workflow_id || '—'} · {(s.session_id || s.id).slice(0, 12)}… · {s.created_at?.slice(0, 10) || ''}
          </option>
        {/each}
      </select>
    </div>
    <div>
      <label class="text-xs text-gray-600 dark:text-gray-400" for="diff-b">Session B</label>
      <select id="diff-b" class="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" value={sessionB} onchange={onSessionBChange}>
        <option value="">— pick —</option>
        {#each sessions as s (s.session_id || s.id)}
          <option value={s.session_id || s.id}>
            {s.workflow_id || '—'} · {(s.session_id || s.id).slice(0, 12)}… · {s.created_at?.slice(0, 10) || ''}
          </option>
        {/each}
      </select>
    </div>
  </div>

  {#if loading}
    <p class="text-gray-500 dark:text-gray-400 text-sm">{i18n.t('common.loading')}</p>
  {:else if sessionA && sessionB}
    <div class="grid grid-cols-3 gap-3 text-sm">
      <div class="kv-card"><div class="kv-label">A: events</div><div class="kv-value">{auditLogA.length}</div></div>
      <div class="kv-card"><div class="kv-label">B: events</div><div class="kv-value">{auditLogB.length}</div></div>
      <div class="kv-card"><div class="kv-label">Common nodes</div><div class="kv-value">{diffPairs.filter((p) => p.entryA && p.entryB).length}</div></div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      {#if diffPairs.length === 0}
        <p class="p-8 text-center text-gray-500 dark:text-gray-400">No node-level events in either session.</p>
      {:else}
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-2">Node</th>
              <th class="px-4 py-2">Status</th>
              <th class="px-4 py-2">A output (first 200)</th>
              <th class="px-4 py-2">B output (first 200)</th>
            </tr>
          </thead>
          <tbody>
            {#each diffPairs as pair (pair.nodeId)}
              {@const status = statusForPair(pair)}
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onclick={() => (selectedNodeId = pair.nodeId)}>
                <td class="px-4 py-2 font-mono text-xs">{pair.nodeId}</td>
                <td class="px-4 py-2">
                  {#if status === 'same'}
                    <span class="tag tag-green">same</span>
                  {:else if status === 'differs'}
                    <span class="tag tag-yellow">differs</span>
                  {:else if status === 'only-a'}
                    <span class="tag">only A</span>
                  {:else}
                    <span class="tag">only B</span>
                  {/if}
                </td>
                <td class="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 max-w-md truncate">{truncate(pair.entryA?.output, 200) || '—'}</td>
                <td class="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 max-w-md truncate">{truncate(pair.entryB?.output, 200) || '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>

    {#if selectedPair}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white font-mono">{selectedPair.nodeId}</h3>
          <button class="text-xs text-gray-500 dark:text-gray-400 hover:underline" onclick={() => (selectedNodeId = null)}>Close</button>
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div class="text-gray-500 dark:text-gray-400 mb-1">A — full output</div>
            <pre class="json-block">{selectedPair.entryA?.output || '(none)'}</pre>
          </div>
          <div>
            <div class="text-gray-500 dark:text-gray-400 mb-1">B — full output</div>
            <pre class="json-block">{selectedPair.entryB?.output || '(none)'}</pre>
          </div>
        </div>
      </div>
    {/if}
  {:else if !loadingSessions && sessions.length === 0}
    <p class="text-gray-500 dark:text-gray-400 text-sm">No completed sessions found. Run a workflow first.</p>
  {/if}
</div>

<style>
  .kv-card {
    background: rgba(137, 180, 250, 0.05);
    border: 1px solid var(--color-border, #313244);
    border-radius: 6px;
    padding: 8px 10px;
  }
  .kv-label { font-size: 0.7rem; color: var(--color-text-muted, #6c7086); text-transform: uppercase; }
  .kv-value { font-size: 0.95rem; color: var(--color-text, #cdd6f4); margin-top: 2px; }
  .tag {
    display: inline-block;
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--color-surface, #313244);
    color: var(--color-text-muted, #6c7086);
  }
  .tag-green { background: rgba(166, 227, 161, 0.15); color: #a6e3a1; }
  .tag-yellow { background: rgba(250, 179, 135, 0.15); color: #fab387; }
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

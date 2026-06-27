<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import {
    listCatalogSources,
    fetchCatalogSource,
    fetchAllCatalogSources,
    getCatalog,
    runCatalogImport,
    publishNewModules,
  } from '../lib/catalog/api.js';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  let t = $derived((key, params) => i18n.t(key, params));

  // Tabs: 'sources' | 'preview' | 'diff' | 'stale'
  let activeTab = $state('sources');

  // Source list + per-source fetch state
  let sources = $state([]);
  let loadingSources = $state(false);
  let fetchingSource = $state(null); // name currently being fetched
  let fetchingAll = $state(false);

  // Catalog browser
  let catalog = $state(null);
  let loadingCatalog = $state(false);
  let previewFilter = $state({ source: '', provider: '', reasoning: 'all' });

  // Import diff
  let lastDiff = $state(null);
  let lastImport = $state(null);
  let runningImport = $state(false);
  let pendingApply = $state(false);
  let importError = $state(null);
  let importSources = $state([]); // checked names (empty = all)

  // Phase 4: publish-new — batched POST /publish for would_create entries
  let publishResults = $state(null);
  let publishing = $state(false);
  let publishError = $state(null);

  async function handlePublishNew() {
    if (!lastImport) return;
    const ids = (lastImport.entries || [])
      .filter((e) => e.action === 'create')
      .map((e) => e.module_id);
    if (ids.length === 0) {
      publishError = 'No newly-created modules to publish (apply first)';
      return;
    }
    publishing = true;
    publishError = null;
    publishResults = null;
    try {
      publishResults = await publishNewModules(ids);
    } catch (e) {
      publishError = e.message;
    } finally {
      publishing = false;
    }
  }

  onMount(loadSources);

  async function loadSources() {
    loadingSources = true;
    try {
      sources = await listCatalogSources();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loadingSources = false;
    }
  }

  async function handleFetchOne(name) {
    fetchingSource = name;
    try {
      await fetchCatalogSource(name);
      await loadSources();
      if (activeTab === 'preview') await loadCatalog();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      fetchingSource = null;
    }
  }

  async function handleFetchAll() {
    fetchingAll = true;
    try {
      await fetchAllCatalogSources();
      await loadSources();
      if (activeTab === 'preview') await loadCatalog();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      fetchingAll = false;
    }
  }

  async function loadCatalog() {
    loadingCatalog = true;
    try {
      catalog = await getCatalog({
        source: previewFilter.source || null,
      });
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loadingCatalog = false;
    }
  }

  async function handleRunDiff() {
    runningImport = true;
    importError = null;
    lastDiff = null;
    lastImport = null;
    try {
      lastDiff = await runCatalogImport({
        dryRun: true,
        sources: importSources,
      });
    } catch (e) {
      importError = e.message;
    } finally {
      runningImport = false;
    }
  }

  async function confirmApply() {
    pendingApply = false;
    runningImport = true;
    importError = null;
    lastImport = null;
    try {
      lastImport = await runCatalogImport({
        dryRun: false,
        sources: importSources,
      });
      await loadCatalog();
    } catch (e) {
      importError = e.message;
    } finally {
      runningImport = false;
    }
  }

  function toggleImportSource(name) {
    const next = new Set(importSources);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    importSources = [...next];
  }

  // Derived: filtered + grouped catalog models
  let filteredModels = $derived.by(() => {
    if (!catalog) return [];
    const out = [];
    for (const s of catalog.sources) {
      if (previewFilter.source && s.name !== previewFilter.source) continue;
      for (const m of s.models) {
        if (previewFilter.provider && m.provider !== previewFilter.provider) continue;
        if (previewFilter.reasoning === 'yes' && !m.can_reason) continue;
        if (previewFilter.reasoning === 'no' && m.can_reason) continue;
        out.push({ ...m, _source: s.name });
      }
    }
    return out;
  });

  let availableProviders = $derived.by(() => {
    if (!catalog) return [];
    const set = new Set();
    for (const s of catalog.sources) {
      for (const m of s.models) set.add(m.provider);
    }
    return [...set].sort();
  });

  function statusColor(s) {
    if (!s) return 'bg-gray-300 dark:bg-gray-600';
    if (s.error) return 'bg-red-500 dark:bg-red-400';
    if (s.cloned) return 'bg-blue-500 dark:bg-blue-400';
    if (s.pulled) return 'bg-green-500 dark:bg-green-400';
    return 'bg-gray-400 dark:bg-gray-500';
  }

  function actionBadge(a) {
    if (a === 'create') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (a === 'update') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    if (a === 'stale')  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (a === 'skip')   return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  }

  function fmtMoney(v) {
    return v == null ? '—' : `$${v.toFixed(2)}`;
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{t('catalog.title')}</h1>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Public LLM metadata databases (catwalk + llm_db) as source of truth.
      </p>
    </div>
  </div>

  <!-- Tabs -->
  <div class="border-b border-gray-200 dark:border-gray-700 flex gap-1">
    {#each [
      { id: 'sources', label: t('catalog.sources') },
      { id: 'preview', label: t('catalog.preview') },
      { id: 'diff',    label: t('catalog.diff') },
      { id: 'stale',   label: t('catalog.stale') },
    ] as tab}
      <button
        class="px-4 py-2 text-sm font-medium border-b-2 {activeTab === tab.id ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}"
        onclick={() => (activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- ================== Sources tab ================== -->
  {#if activeTab === 'sources'}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Configured catalogs</h2>
        <div class="flex gap-2">
          <button class="text-xs px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600" onclick={loadSources}>Refresh</button>
          <button
            class="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            onclick={handleFetchAll}
            disabled={fetchingAll}
          >
            {fetchingAll ? 'Fetching…' : 'Fetch all'}
          </button>
        </div>
      </div>

      {#if loadingSources}
        <p class="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">{t('common.loading')}</p>
      {:else if sources.length === 0}
        <p class="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">No catalog sources configured.</p>
      {:else}
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-2">Name</th>
              <th class="px-4 py-2">Repo</th>
              <th class="px-4 py-2">Branch</th>
              <th class="px-4 py-2">Path</th>
              <th class="px-4 py-2">Last fetch</th>
              <th class="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each sources as s (s.name)}
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-4 py-2 font-medium text-gray-900 dark:text-white">
                  <div class="flex items-center gap-2">
                    <span class="inline-block w-2 h-2 rounded-full {statusColor(s.last_fetch)}"></span>
                    {s.name}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{s.description}</div>
                </td>
                <td class="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-400 break-all">{s.repo_url}</td>
                <td class="px-4 py-2 font-mono text-xs">{s.branch}</td>
                <td class="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">{s.path}</td>
                <td class="px-4 py-2 text-xs">
                  {#if s.last_fetch}
                    <div class="font-mono text-gray-600 dark:text-gray-400">{s.last_fetch.commit_sha?.slice(0, 8) || '?'}</div>
                    <div class="text-gray-400 dark:text-gray-500">{s.last_fetch.cloned ? 'cloned' : s.last_fetch.pulled ? 'pulled' : ''}</div>
                    {#if s.last_fetch.error}
                      <div class="text-red-500">⚠ {s.last_fetch.error.slice(0, 40)}…</div>
                    {/if}
                  {:else}
                    <span class="text-gray-400 dark:text-gray-500">never</span>
                  {/if}
                </td>
                <td class="px-4 py-2 text-right space-x-1">
                  <button
                    class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded disabled:opacity-50"
                    onclick={() => handleFetchOne(s.name)}
                    disabled={fetchingSource !== null}
                  >
                    {fetchingSource === s.name ? '…' : 'Fetch'}
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}

  <!-- ================== Preview tab ================== -->
  {#if activeTab === 'preview'}
    <div class="space-y-3">
      <div class="flex items-center gap-2 flex-wrap">
        <select class="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" bind:value={previewFilter.source}>
          <option value="">all sources</option>
          {#each (catalog?.sources || []) as s (s.name)}
            <option value={s.name}>{s.name} ({s.model_count})</option>
          {/each}
        </select>
        <select class="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" bind:value={previewFilter.provider}>
          <option value="">all providers</option>
          {#each availableProviders as p (p)}
            <option value={p}>{p}</option>
          {/each}
        </select>
        <select class="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" bind:value={previewFilter.reasoning}>
          <option value="all">reasoning: all</option>
          <option value="yes">reasoning: yes</option>
          <option value="no">reasoning: no</option>
        </select>
        <button class="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700" onclick={loadCatalog}>
          {loadingCatalog ? 'Loading…' : 'Reload catalog'}
        </button>
        <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">{filteredModels.length} models</span>
      </div>

      {#if !catalog}
        <p class="text-gray-500 dark:text-gray-400 text-sm">Click "Reload catalog" to load the local cache.</p>
      {:else}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
              <tr>
                <th class="px-3 py-2">Source</th>
                <th class="px-3 py-2">Provider</th>
                <th class="px-3 py-2">Model</th>
                <th class="px-3 py-2">Context</th>
                <th class="px-3 py-2">$/M in</th>
                <th class="px-3 py-2">$/M out</th>
                <th class="px-3 py-2 text-center">Reason</th>
                <th class="px-3 py-2 text-center">Modalities</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredModels.slice(0, 200) as m, i (i + ':' + m._source + ':' + m.provider + ':' + m.catalog_id)}
                <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="px-3 py-1.5 text-xs">
                    <span class="px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{m._source}</span>
                  </td>
                  <td class="px-3 py-1.5 font-mono text-xs">{m.provider}</td>
                  <td class="px-3 py-1.5 font-mono text-xs">{m.catalog_id}</td>
                  <td class="px-3 py-1.5 text-xs">{m.context_window?.toLocaleString() ?? '—'}</td>
                  <td class="px-3 py-1.5 text-xs">{fmtMoney(m.cost_per_1m_input)}</td>
                  <td class="px-3 py-1.5 text-xs">{fmtMoney(m.cost_per_1m_output)}</td>
                  <td class="px-3 py-1.5 text-center text-xs">
                    {#if m.can_reason}<span class="text-blue-600 dark:text-blue-400">🧠</span>{:else}<span class="text-gray-300">·</span>{/if}
                  </td>
                  <td class="px-3 py-1.5 text-center text-xs text-gray-500 dark:text-gray-400">
                    {#if m.modalities && (m.modalities.input?.length || m.modalities.output?.length)}
                      {(m.modalities.input || []).slice(0,2).join(',')}
                      {#if (m.modalities.input || []).length > 2}…{/if}
                      →
                      {(m.modalities.output || []).join(',')}
                    {:else}—{/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          {#if filteredModels.length > 200}
            <p class="p-3 text-center text-xs text-gray-500 dark:text-gray-400">… and {filteredModels.length - 200} more (use filters to narrow)</p>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  <!-- ================== Diff tab ================== -->
  {#if activeTab === 'diff'}
    <div class="space-y-3">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-3">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Source filter</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Leave all unchecked to import from every configured source.</p>
        <div class="flex flex-wrap gap-2">
          {#each sources as s (s.name)}
            <label class="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <input type="checkbox" checked={importSources.includes(s.name)} onchange={() => toggleImportSource(s.name)} />
              {s.name}
            </label>
          {/each}
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          onclick={handleRunDiff}
          disabled={runningImport}
        >
          {runningImport ? 'Running…' : 'Run diff (dry-run)'}
        </button>
        {#if lastDiff}
          <button
            class="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            onclick={() => (pendingApply = true)}
            disabled={runningImport || (lastDiff.by_action?.create === 0 && lastDiff.by_action?.update === 0)}
          >
            Apply ({lastDiff.by_action?.create || 0} new, {lastDiff.by_action?.update || 0} updates)
          </button>
          {#if lastImport && (lastImport.by_action?.create || 0) > 0}
            <button
              class="text-xs px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              onclick={handlePublishNew}
              disabled={publishing}
            >
              {publishing ? 'Publishing…' : `Publish new (${lastImport.by_action?.create || 0})`}
            </button>
          {/if}
        {/if}
      </div>

      {#if importError}
        <div class="form-error">⚠ {importError}</div>
      {/if}
      {#if publishError}
        <div class="form-error">⚠ {publishError}</div>
      {/if}
      {#if publishResults}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-3 text-xs">
          <div class="font-semibold mb-2 text-gray-900 dark:text-white">
            Publish results ({publishResults.length})
          </div>
          <ul class="space-y-1 max-h-48 overflow-y-auto">
            {#each publishResults as r, i (i)}
              <li class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full {r.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : r.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}">{r.status}</span>
                <code class="font-mono">{r.module_id}</code>
                {#if r.error}<span class="text-red-500 truncate">— {r.error}</span>{/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if lastDiff}
        <div class="flex gap-2 text-xs">
          <span class="px-2 py-1 rounded-full {actionBadge('create')}">create {lastDiff.by_action?.create || 0}</span>
          <span class="px-2 py-1 rounded-full {actionBadge('update')}">update {lastDiff.by_action?.update || 0}</span>
          <span class="px-2 py-1 rounded-full {actionBadge('skip')}">skip {lastDiff.by_action?.skip || 0}</span>
          <span class="px-2 py-1 rounded-full {actionBadge('stale')}">stale {lastDiff.by_action?.stale || 0}</span>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto max-h-96 overflow-y-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th class="px-3 py-2">Action</th>
                <th class="px-3 py-2">Provider</th>
                <th class="px-3 py-2">Model</th>
                <th class="px-3 py-2">Module ID</th>
                <th class="px-3 py-2">Reason / changes</th>
              </tr>
            </thead>
            <tbody>
              {#each lastDiff.entries as e (e.module_id)}
                <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="px-3 py-1.5">
                    <span class="text-xs px-2 py-0.5 rounded-full {actionBadge(e.action)}">{e.action}</span>
                  </td>
                  <td class="px-3 py-1.5 font-mono text-xs">{e.provider || '—'}</td>
                  <td class="px-3 py-1.5 font-mono text-xs">{e.catalog_id || '—'}</td>
                  <td class="px-3 py-1.5 font-mono text-xs text-gray-500 dark:text-gray-400">{e.module_id}</td>
                  <td class="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400">
                    {e.reason}
                    {#if e.changes?.length}
                      <details class="mt-1">
                        <summary class="cursor-pointer text-gray-500 dark:text-gray-400">{e.changes.length} field(s)</summary>
                        <ul class="pl-4 mt-1 text-xs space-y-0.5">
                          {#each e.changes.slice(0, 5) as c, i (i)}<li><code class="font-mono">{c}</code></li>{/each}
                          {#if e.changes.length > 5}<li class="text-gray-400 dark:text-gray-500">… +{e.changes.length - 5} more</li>{/if}
                        </ul>
                      </details>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      {#if lastImport}
        <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-xs text-green-700 dark:text-green-300">
          ✓ Applied at {lastImport.finished_at} — created: {lastImport.by_action?.create || 0},
          updated: {lastImport.by_action?.update || 0}, staled: {lastImport.by_action?.stale || 0}
        </div>
      {/if}
    </div>
  {/if}

  <!-- ================== Stale tab ================== -->
  {#if activeTab === 'stale'}
    <div class="space-y-3">
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Local llm-profiles that have no matching entry in the catalog.
        They are kept on disk; a separate cleanup job can act on the
        <code class="font-mono">.stale</code> flag file written by
        Apply.
      </p>
      {#if !lastDiff}
        <button class="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700" onclick={handleRunDiff}>
          Refresh stale list
        </button>
      {:else}
        {#each lastDiff.entries.filter((e) => e.action === 'stale') as e (e.module_id)}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-red-200 dark:border-red-800 p-3 flex items-center justify-between">
            <div>
              <code class="font-mono text-sm">{e.module_id}</code>
              <div class="text-xs text-gray-500 dark:text-gray-400">{e.reason}</div>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">stale</span>
          </div>
        {:else}
          <p class="text-gray-500 dark:text-gray-400 text-sm">No stale modules. ✓</p>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<ConfirmDialog
  open={pendingApply}
  title="Apply catalog import?"
  message="This will create / update local llm-profiles modules. Stale entries get a .stale flag but are NOT deleted."
  confirmLabel="Apply"
  cancelLabel={t('common.cancel')}
  variant="primary"
  onConfirm={confirmApply}
  onCancel={() => (pendingApply = false)}
/>

<style>
  .form-error {
    padding: 8px 12px;
    border-radius: 6px;
    background: rgba(243, 139, 168, 0.1);
    border: 1px solid var(--color-error, #f38ba8);
    color: var(--color-error, #f38ba8);
    font-size: 0.85rem;
  }
</style>

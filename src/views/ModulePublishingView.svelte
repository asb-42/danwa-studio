<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import {
    listLocalModules,
    validateModule,
    exportModulePack,
    fetchRepoIndex,
    checkRepoUpdates,
  } from '../lib/publishing/api.js';
  import ModuleDetailModal from '../components/modules/ModuleDetailModal.svelte';

  let t = $derived((key, params) => $i18n.t(key, params));

  // Local modules + remote state
  let localModules = $state([]);
  let remoteIndex = $state([]);
  let updatesAvailable = $state([]);
  let loading = $state(false);
  let loadingRemote = $state(false);

  // Validation form (paste manifest JSON)
  let manifestJson = $state('');
  let validationResult = $state(null);
  let validating = $state(false);

  // Detail view (reuse ModuleDetailModal from Sprint 2)
  let viewingModule = $state(null);
  let showDetail = $state(false);

  // Last export info
  let lastExport = $state(null);
  let exporting = $state(false);

  onMount(loadAll);

  async function loadAll() {
    loading = true;
    try {
      localModules = await listLocalModules();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loading = false;
    }
  }

  async function loadRemote() {
    loadingRemote = true;
    try {
      [remoteIndex, updatesAvailable] = await Promise.all([
        fetchRepoIndex(),
        checkRepoUpdates(),
      ]);
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loadingRemote = false;
    }
  }

  async function handleValidate() {
    if (!manifestJson.trim()) {
      errorStore.set('Paste a manifest.json to validate');
      return;
    }
    let manifest;
    try {
      manifest = JSON.parse(manifestJson);
    } catch (e) {
      errorStore.set(`Invalid JSON: ${e.message}`);
      return;
    }
    validating = true;
    validationResult = null;
    try {
      validationResult = await validateModule(manifest);
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      validating = false;
    }
  }

  function viewDetail(m) {
    viewingModule = m;
    showDetail = true;
  }

  async function handleExport(m) {
    exporting = true;
    lastExport = null;
    try {
      const result = await exportModulePack(m.module_id);
      if (result instanceof Blob) {
        // Trigger download
        const url = URL.createObjectURL(result);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${m.module_id}-${m.version || 'pack'}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        lastExport = { module_id: m.module_id, at: new Date().toISOString(), size: result.size, mode: 'zip' };
      } else {
        // JSON response — server didn't return a binary blob
        lastExport = { module_id: m.module_id, at: new Date().toISOString(), mode: 'json', data: result };
      }
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      exporting = false;
    }
  }

  // Helper: insert pre-canned publish handoff command
  function handoffCommand(m) {
    return `# On the server, then run:
cd /path/to/danwa-modules
git checkout -b publish/${m.module_id}-${m.version || 'x'}
git pull  # ensure base is current
# (copy the zip or edited files in)
git add ${m.module_id}/
git commit -m "publish(${m.module_id}): v${m.version || 'x'}"
git push origin publish/${m.module_id}-${m.version || 'x'}
# Then open a PR on github.com/asb-42/danwa-modules`;
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Module Publishing</h1>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Validate manifests, export module packs, and hand off to the danwa-modules repo.
      </p>
    </div>
  </div>

  <!-- Pipeline overview -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
    <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Publishing pipeline</h2>
    <ol class="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal pl-5">
      <li>Edit the module under <code class="font-mono">danwa-modules/<type>/<id>/</code> locally.</li>
      <li>Validate the manifest here (paste the JSON below).</li>
      <li>Export the module as a zip pack (button in the table).</li>
      <li>Run the hand-off commands printed at the bottom to <code class="font-mono">git commit && git push</code> in <code class="font-mono">danwa-modules</code>.</li>
      <li>Open a PR; once merged, <strong>Update available</strong> shows up in the ModulesView.</li>
    </ol>
  </div>

  <!-- Validate manifest -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 space-y-3">
    <h2 class="text-sm font-semibold text-gray-900 dark:text-white">1. Validate manifest</h2>
    <p class="text-xs text-gray-500 dark:text-gray-400">
      Paste a <code class="font-mono">manifest.json</code> here. The backend runs the validator without touching disk.
    </p>
    <textarea class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 font-mono text-xs" rows="8" bind:value={manifestJson} placeholder='{ "id": "my-module", "name": { "en": "My Module" }, "type": "agent-core", "version": "0.1.0", ... }'></textarea>
    <div class="flex items-center gap-2">
      <button class="btn-primary" onclick={handleValidate} disabled={validating}>
        {validating ? '…' : 'Validate'}
      </button>
      {#if validationResult}
        <span class="text-xs">
          {#if validationResult.valid}
            <span class="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">✓ valid ({validationResult.file_count} files)</span>
          {:else}
            <span class="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">✗ {validationResult.issues?.length || 0} issue(s)</span>
          {/if}
        </span>
      {/if}
    </div>
    {#if validationResult?.issues?.length}
      <ul class="text-xs space-y-1 max-h-40 overflow-y-auto">
        {#each validationResult.issues as issue, i (i)}
          <li class="px-2 py-1 rounded {issue.severity === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'}">
            <strong>{issue.severity}</strong> · {issue.field}: {issue.message}
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- Local modules + export -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white">2. Local modules — export as pack</h2>
      <div class="flex gap-2">
        <button class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded" onclick={loadAll}>Refresh local</button>
        <button class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded" onclick={loadRemote}>
          {loadingRemote ? 'Loading…' : 'Compare with remote'}
        </button>
      </div>
    </div>
    {#if loading}
      <p class="p-8 text-center text-gray-500 text-sm">{$i18n.t('common.loading')}</p>
    {:else if localModules.length === 0}
      <p class="p-8 text-center text-gray-500 text-sm">No local modules installed yet.</p>
    {:else}
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-4 py-2">Module</th>
            <th class="px-4 py-2">Type</th>
            <th class="px-4 py-2">Version</th>
            <th class="px-4 py-2">Updates</th>
            <th class="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each localModules as m (m.module_id)}
            {@const hasUpdate = updatesAvailable.some((u) => u.module_id === m.module_id)}
            <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td class="px-4 py-2">
                <button class="text-sm font-mono text-blue-600 dark:text-blue-400 hover:underline" onclick={() => viewDetail(m)}>
                  {m.module_id}
                </button>
                <div class="text-xs text-gray-500">{m.name}</div>
              </td>
              <td class="px-4 py-2 text-xs">{m.type}</td>
              <td class="px-4 py-2 text-xs font-mono">{m.version || '—'}</td>
              <td class="px-4 py-2 text-xs">
                {#if hasUpdate}
                  <span class="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">↑ update</span>
                {:else}
                  <span class="text-gray-400">—</span>
                {/if}
              </td>
              <td class="px-4 py-2 text-right space-x-1">
                <button class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded" onclick={() => handleExport(m)} disabled={exporting}>
                  {exporting ? '…' : 'Export .zip'}
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  {#if lastExport}
    <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-xs text-green-700 dark:text-green-300">
      ✓ Exported <code class="font-mono">{lastExport.module_id}</code> at {lastExport.at}
      {#if lastExport.size}({(lastExport.size / 1024).toFixed(1)} KB){/if}
    </div>
  {/if}

  <!-- Hand-off section -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 space-y-3">
    <h2 class="text-sm font-semibold text-gray-900 dark:text-white">3. Hand off to danwa-modules (Git)</h2>
    <p class="text-xs text-gray-500 dark:text-gray-400">
      The backend has no Git endpoint (yet). The commands below are the manual handoff —
      they can be copy-pasted into a shell on the server that has write access to the
      <code class="font-mono">danwa-modules</code> repo.
    </p>
    {#if localModules.length > 0}
      <div class="space-y-2">
        {#each localModules.slice(0, 3) as m (m.module_id)}
          <details class="border border-gray-200 dark:border-gray-700 rounded">
            <summary class="cursor-pointer text-xs px-2 py-1 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700">
              Hand-off for <code class="font-mono">{m.module_id}</code>
            </summary>
            <pre class="json-block">{handoffCommand(m)}</pre>
          </details>
        {/each}
      </div>
    {/if}
  </div>
</div>

<ModuleDetailModal
  moduleInfo={viewingModule}
  visible={showDetail}
  onClose={() => { showDetail = false; viewingModule = null; }}
/>

<style>
  .btn-primary {
    padding: 8px 16px; border: none; border-radius: 6px;
    background: var(--color-primary, #89b4fa); color: var(--color-bg, #1e1e2e);
    font-size: 0.875rem; font-weight: 600; cursor: pointer;
  }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .json-block {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    padding: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--color-text, #cdd6f4);
    white-space: pre;
    margin: 0;
  }
</style>

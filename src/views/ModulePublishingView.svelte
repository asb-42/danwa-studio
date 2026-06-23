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
    publishModule,
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

  // Publish state (real Git workflow via backend)
  let publishing = $state(false);
  let lastPublish = $state(null);
  let publishError = $state(null);
  let publishMessage = $state('');

  async function handlePublish(m) {
    publishing = true;
    publishError = null;
    lastPublish = null;
    // Pull the live manifest from the on-disk module via the existing
    // /api/v1/modules/{id}/profile endpoint (already wrapped in
    // lib/blueprint/api.js as getModuleProfile).
    let manifest = null;
    try {
      const profile = await (await import('../lib/blueprint/api.js')).getModuleProfile(m.module_id);
      manifest = profile;
    } catch (e) {
      // fall through to lastPublish below
    }
    if (!manifest) {
      publishError = `Could not load manifest for ${m.module_id} from backend`;
      publishing = false;
      return;
    }
    try {
      const report = await publishModule(m.module_id, {
        manifest,
        commit_message: publishMessage.trim() || undefined,
      });
      lastPublish = report;
      if (report.status === 'failed') {
        publishError = report.error || 'publish failed (see steps)';
      } else {
        await loadAll();
      }
    } catch (e) {
      publishError = e.message;
    } finally {
      publishing = false;
    }
  }

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
      <li>Validate the manifest here (paste the JSON below).</li>
      <li>Click <em>Publish</em> on a row in the table — the backend commits (and optionally pushes) the live manifest to the <code class="font-mono">danwa-modules</code> repo on a <code class="font-mono">{'publish/<id>'}</code> branch.</li>
      <li>Optionally export the module as a zip pack for offline use / uploading.</li>
      <li>Open a PR on github.com/asb-42/danwa-modules; once merged, <strong>Update available</strong> shows up in the ModulesView.</li>
    </ol>
  </div>

  <!-- Validate manifest -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 space-y-3">
    <h2 class="text-sm font-semibold text-gray-900 dark:text-white">1. Validate manifest</h2>
    <p class="text-xs text-gray-500 dark:text-gray-400">
      Paste a <code class="font-mono">manifest.json</code> here. The backend runs the validator without touching disk.
    </p>
    <textarea class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 font-mono text-xs" rows="8" bind:value={manifestJson} placeholder={'{ "id": "my-module", "name": { "en": "My Module" }, "type": "agent-core", "version": "0.1.0", ... }'}></textarea>
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
                <button class="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded" onclick={() => handlePublish(m)} disabled={publishing}>
                  {publishing ? '…' : 'Publish'}
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

  <!-- Real Git publishing (Sprint 7) -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 space-y-3">
    <h2 class="text-sm font-semibold text-gray-900 dark:text-white">3. Publish to danwa-modules (Git)</h2>
    <p class="text-xs text-gray-500 dark:text-gray-400">
      Click <em>Publish</em> on a row in the table above to commit (and optionally push)
      the live module manifest to the danwa-modules repo.
    </p>
    <details class="border border-gray-200 dark:border-gray-700 rounded">
      <summary class="cursor-pointer text-xs px-2 py-1 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700">
        Custom commit message (optional)
      </summary>
      <div class="p-3">
        <input
          type="text"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-xs font-mono"
          bind:value={publishMessage}
          placeholder="leave empty for auto-generated 'publish(<id>): v<x.y.z>'"
        />
      </div>
    </details>
    {#if publishError}
      <div class="form-error">⚠ {publishError}</div>
    {/if}
    {#if lastPublish}
      <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-sm font-semibold text-gray-900 dark:text-white">
            Result: {lastPublish.status}
          </span>
          {#if lastPublish.status === 'published'}
            <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">✓ pushed</span>
          {:else if lastPublish.status === 'local_only'}
            <span class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">◌ committed, not pushed</span>
          {:else if lastPublish.status === 'noop'}
            <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">○ no changes</span>
          {:else if lastPublish.status === 'failed'}
            <span class="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">✗ failed</span>
          {/if}
          <span class="text-xs text-gray-500 font-mono">
            branch={lastPublish.branch}
            {#if lastPublish.commit_sha} · sha={lastPublish.commit_sha.slice(0, 7)}{/if}
            {#if lastPublish.pushed} · pushed to {lastPublish.push_remote}{/if}
          </span>
        </div>
        <ol class="text-xs space-y-1 list-decimal pl-5 max-h-48 overflow-y-auto">
          {#each lastPublish.steps as s, i (i)}
            <li class="{s.ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}">
              <code class="font-mono">{s.name}</code>: {s.detail}
              <span class="text-gray-400">({s.elapsed_ms}ms)</span>
            </li>
          {/each}
        </ol>
        <details class="mt-2">
          <summary class="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">Raw report (JSON)</summary>
          <pre class="json-block">{JSON.stringify(lastPublish, null, 2)}</pre>
        </details>
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
  .form-error {
    padding: 8px 12px;
    border-radius: 6px;
    background: rgba(243, 139, 168, 0.1);
    border: 1px solid var(--color-error, #f38ba8);
    color: var(--color-error, #f38ba8);
    font-size: 0.85rem;
  }
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

<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import { listModules, getRepoIndex, checkRepoUpdates } from '../lib/modules/api.js';
  import ModuleDetailModal from '../components/modules/ModuleDetailModal.svelte';

  let t = $derived((key, params) => $i18n.t(key, params));

  let modules = $state([]);
  let loading = $state(false);
  let showModal = $state(false);
  let viewingModule = $state(null);

  // Filters
  let filterType = $state('');
  let filterCategory = $state('');
  let filterEnabled = $state('all'); // 'all' | 'enabled' | 'disabled'

  // Repo integration
  let repoIndex = $state(null);
  let updatesAvailable = $state([]);
  let showRepoPanel = $state(false);

  async function loadModules() {
    loading = true;
    try {
      modules = await listModules();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loading = false;
    }
  }

  async function loadRepo() {
    try {
      [repoIndex, updatesAvailable] = await Promise.all([
        getRepoIndex().catch((e) => {
          console.warn('Could not fetch repo index:', e.message);
          return [];
        }),
        checkRepoUpdates().catch((e) => {
          console.warn('Could not check updates:', e.message);
          return [];
        }),
      ]);
    } catch (e) {
      errorStore.set(e.message);
    }
  }

  onMount(() => {
    loadModules();
  });

  function handleView(m) {
    viewingModule = m;
    showModal = true;
  }

  function handleToggleRepo() {
    showRepoPanel = !showRepoPanel;
    if (showRepoPanel && !repoIndex) {
      loadRepo();
    }
  }

  // Derived: filtered + counts
  let filteredModules = $derived(
    modules.filter((m) => {
      if (filterType && m.type !== filterType) return false;
      if (filterCategory && m.category !== filterCategory) return false;
      if (filterEnabled === 'enabled' && !m.enabled) return false;
      if (filterEnabled === 'disabled' && m.enabled) return false;
      return true;
    }),
  );

  // Build distinct option lists from the data
  let availableTypes = $derived([...new Set(modules.map((m) => m.type).filter(Boolean))].sort());
  let availableCategories = $derived(
    [...new Set(modules.map((m) => m.category).filter(Boolean))].sort(),
  );

  let stats = $derived({
    total: modules.length,
    enabled: modules.filter((m) => m.enabled).length,
    installed: modules.filter((m) => m.installed).length,
    updates: updatesAvailable.length,
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{$i18n.t('nav.modules')}</h1>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Read-only view — installs happen via <code class="font-mono">danwa-modules</code> repo
      </p>
    </div>
    <div class="flex gap-2">
      <button class="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600" onclick={handleToggleRepo}>
        {showRepoPanel ? 'Hide Repo' : 'Show Repo'}
      </button>
    </div>
  </div>

  <!-- Stats bar -->
  <div class="grid grid-cols-4 gap-3 text-sm">
    <div class="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
      <div class="text-2xl font-semibold">{stats.total}</div>
      <div class="text-gray-500 text-xs">Total modules</div>
    </div>
    <div class="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
      <div class="text-2xl font-semibold text-green-600 dark:text-green-400">{stats.enabled}</div>
      <div class="text-gray-500 text-xs">Enabled</div>
    </div>
    <div class="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
      <div class="text-2xl font-semibold text-blue-600 dark:text-blue-400">{stats.installed}</div>
      <div class="text-gray-500 text-xs">Installed in DB</div>
    </div>
    <div class="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
      <div class="text-2xl font-semibold text-orange-600 dark:text-orange-400">{stats.updates}</div>
      <div class="text-gray-500 text-xs">Updates available</div>
    </div>
  </div>

  <!-- Repo panel (collapsed by default) -->
  {#if showRepoPanel}
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <h2 class="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
        danwa-modules Repository
      </h2>
      {#if !repoIndex}
        <p class="text-sm text-gray-600 dark:text-gray-400">Loading…</p>
      {:else if repoIndex.length === 0}
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ⚠️ Could not reach danwa-modules repo. Check connectivity or the
          <code class="font-mono">DANWA_MODULES_REPO</code> env var.
        </p>
      {:else}
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {repoIndex.length} modules in remote index · {updatesAvailable.length} updates available locally
        </p>
      {/if}
    </div>
  {/if}

  <!-- Filter bar -->
  <div class="flex gap-3 items-end flex-wrap">
    <div class="flex flex-col gap-1">
      <label class="text-xs text-gray-600 dark:text-gray-400" for="filter-type">Type</label>
      <select id="filter-type" class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm" bind:value={filterType}>
        <option value="">all</option>
        {#each availableTypes as t (t)}
          <option value={t}>{t}</option>
        {/each}
      </select>
    </div>
    <div class="flex flex-col gap-1">
      <label class="text-xs text-gray-600 dark:text-gray-400" for="filter-category">Category</label>
      <select id="filter-category" class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm" bind:value={filterCategory}>
        <option value="">all</option>
        {#each availableCategories as c (c)}
          <option value={c}>{c}</option>
        {/each}
      </select>
    </div>
    <div class="flex flex-col gap-1">
      <label class="text-xs text-gray-600 dark:text-gray-400" for="filter-enabled">State</label>
      <select id="filter-enabled" class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm" bind:value={filterEnabled}>
        <option value="all">all</option>
        <option value="enabled">enabled</option>
        <option value="disabled">disabled</option>
      </select>
    </div>
    <button class="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-600" onclick={loadModules}>
      Refresh
    </button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-32">
      <p class="text-gray-500">{$i18n.t('common.loading')}</p>
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      {#if filteredModules.length === 0}
        <div class="p-8 text-center">
          <p class="text-gray-500 dark:text-gray-400">{$i18n.t('common.noData')}</p>
        </div>
      {:else}
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-3">Name</th>
              <th class="px-4 py-3">ID</th>
              <th class="px-4 py-3">Type</th>
              <th class="px-4 py-3">Category</th>
              <th class="px-4 py-3">Version</th>
              <th class="px-4 py-3">Lang</th>
              <th class="px-4 py-3">State</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredModules as m (m.module_id)}
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {m.name || m.module_id}
                </td>
                <td class="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                  {m.module_id}
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {m.type || '—'}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{m.category || '—'}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{m.version || '—'}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{m.language || '—'}</td>
                <td class="px-4 py-3">
                  {#if m.enabled}
                    <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">● enabled</span>
                  {:else if m.installed}
                    <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">○ disabled</span>
                  {:else}
                    <span class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">↘ discovered</span>
                  {/if}
                </td>
                <td class="px-4 py-3 text-right">
                  <button class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors" onclick={() => handleView(m)}>
                    View
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}
</div>

<ModuleDetailModal
  moduleInfo={viewingModule}
  visible={showModal}
  onClose={() => { showModal = false; viewingModule = null; }}
/>

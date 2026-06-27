<script>
  import { i18n, resolveLocale } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import {
    listModules,
    getRepoIndex,
    checkRepoUpdates,
    installFromRepo,
    enableModule,
    disableModule,
  } from '../lib/modules/api.js';
  import ModuleDetailModal from '../components/modules/ModuleDetailModal.svelte';

  let t = $derived((key, params) => i18n.t(key, params));

  let modules = $state([]);
  let repoModules = $state([]);
  let loading = $state(false);
  let loadingRepo = $state(false);
  let showModal = $state(false);
  let viewingModule = $state(null);

  // Active tab — category key or 'all'
  let activeTab = $state('all');

  // Filters within a tab
  let filterType = $state('');
  let filterEnabled = $state('all'); // 'all' | 'enabled' | 'disabled'
  let filterStatus = $state('all'); // 'all' | 'installed' | 'available' | 'updatable'
  let searchQuery = $state('');

  // Repo integration
  let updatesAvailable = $state([]);
  let showRepoPanel = $state(false);

  // String counts for language packs (fetched lazily from ui_strings.json)
  let stringCounts = $state({});
  let loadingCounts = $state(false);

  async function loadStringCounts() {
    if (loadingCounts || Object.keys(stringCounts).length > 0) return;
    loadingCounts = true;
    try {
      const langModules = allModules().filter(
        (m) => canonicalCategory(m.category) === 'translations' && m.language,
      );
      const counts = {};
      for (const m of langModules) {
        if (m.string_count != null && m.string_count > 0) {
          counts[m.module_id] = m.string_count;
        }
      }
      stringCounts = counts;
    } catch (e) {
      console.warn('Failed to load string counts:', e);
    } finally {
      loadingCounts = false;
    }
  }

  // Human-readable category labels + icons (normalized from repo categories)
  const categoryInfo = {
    'prompts':                    { label: 'Prompts',              icon: '📝' },
    'agent-argumentation-patterns': { label: 'Prompts',           icon: '📝' },
    'prompt-modifiers':           { label: 'Prompt Modifiers',     icon: '🔧' },
    'agent-prompt-modifiers':     { label: 'Prompt Modifiers',     icon: '🔧' },
    'agents':                     { label: 'Agents',               icon: '🤖' },
    'agent-cores':                { label: 'Agents',               icon: '🤖' },
    'llm-profiles':               { label: 'LLM Profiles',         icon: '🧠' },
    'workflows':                  { label: 'Workflows',            icon: '⚙️' },
    'workflow-variants':          { label: 'Workflow Variants',    icon: '🔀' },
    'tone-profiles':              { label: 'Tone Profiles',        icon: '🎵' },
    'agent-tone-profiles':        { label: 'Tone Profiles',        icon: '🎵' },
    'role-types':                 { label: 'Role Types',           icon: '🎭' },
    'kitsune':                    { label: 'Kitsune Assistants',   icon: '🦊' },
    'kitsune-assistant':          { label: 'Kitsune Assistants',   icon: '🦊' },
    'bundles':                    { label: 'Bundles',              icon: '📦' },
    'agent-bundles':              { label: 'Bundles',              icon: '📦' },
    'translations':               { label: 'Language Packs',       icon: '🌐' },
    'ui-translations':            { label: 'Language Packs',       icon: '🌐' },
  };

  // Canonical category name (normalize repo categories to display categories)
  function canonicalCategory(cat) {
    const map = {
      'agent-argumentation-patterns': 'prompts',
      'agent-prompt-modifiers': 'prompt-modifiers',
      'agent-cores': 'agents',
      'agent-tone-profiles': 'tone-profiles',
      'agent-bundles': 'bundles',
      'kitsune-assistant': 'kitsune',
      'ui-translations': 'translations',
    };
    return map[cat] || cat;
  }

  // ISO 639-1 → Flag emoji mapping for translation modules
  const FLAGS = {
    de: '🇩🇪', en: '🇬🇧', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹',
    pt: '🇧🇷', ru: '🇷🇺', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷',
    sv: '🇸🇪', el: '🇬🇷', ar: '🇸🇦', he: '🇮🇱',
    bg: '🇧🇬', bn: '🇧🇩', bo: '🇧🇴', br: '🇧🇷', cs: '🇨🇿',
    da: '🇩🇰', eo: '🇪🇺', et: '🇪🇪', eu: '🇪🇸', fa: '🇮🇷',
    fi: '🇫🇮', ga: '🇮🇪', hi: '🇮🇳', hr: '🇭🇷', hu: '🇭🇺',
    hy: '🇦🇲', id: '🇮🇩', io: '🇮🇩', is: '🇮🇸', iu: '🇨🇦',
    ka: '🇬🇪', ku: '🇰🇼', la: '🇻🇦', lt: '🇱🇹', lv: '🇱🇻',
    mi: '🇳🇿', mk: '🇲🇰', mr: '🇮🇳', ms: '🇲🇾', nb: '🇳🇴',
    nl: '🇳🇱', nn: '🇳🇴', pl: '🇵🇱', ro: '🇷🇴', sa: '🇮🇳',
    sk: '🇸🇰', sl: '🇸🇮', sq: '🇦🇱', sr: '🇷🇸', ta: '🇮🇳',
    te: '🇮🇳', th: '🇹🇭', tl: '🇵🇭', tr: '🇹🇷', ur: '🇵🇰',
    vi: '🇻🇳', yi: '🇩🇪',
  };

  // ISO 639-1 language names for translation module display
  const languageNames = {
    'bg': 'Bulgarian', 'bn': 'Bengali', 'bo': 'Tibetan', 'br': 'Breton',
    'cs': 'Czech', 'da': 'Danish', 'de': 'German', 'en': 'English',
    'eo': 'Esperanto', 'es': 'Spanish', 'et': 'Estonian', 'eu': 'Basque',
    'fa': 'Persian', 'fi': 'Finnish', 'fr': 'French', 'ga': 'Irish',
    'hi': 'Hindi', 'hr': 'Croatian', 'hu': 'Hungarian', 'hy': 'Armenian',
    'id': 'Indonesian', 'io': 'Ido', 'is': 'Icelandic', 'it': 'Italian',
    'iu': 'Inuktitut', 'ja': 'Japanese', 'ka': 'Georgian', 'ko': 'Korean',
    'ku': 'Kurdish', 'la': 'Latin', 'lt': 'Lithuanian', 'lv': 'Latvian',
    'mi': 'Maori', 'mk': 'Macedonian', 'mr': 'Marathi', 'ms': 'Malay',
    'nb': 'Norwegian Bokmal', 'nl': 'Dutch', 'nn': 'Norwegian Nynorsk',
    'pl': 'Polish', 'pt': 'Portuguese', 'ro': 'Romanian', 'ru': 'Russian',
    'sa': 'Sanskrit', 'sk': 'Slovak', 'sl': 'Slovenian', 'sq': 'Albanian',
    'sr': 'Serbian', 'sv': 'Swedish', 'ta': 'Tamil', 'te': 'Telugu',
    'th': 'Thai', 'tl': 'Tagalog', 'tr': 'Turkish', 'ur': 'Urdu',
    'vi': 'Vietnamese', 'yi': 'Yiddish', 'zh': 'Chinese',
  };

  function languageName(code) {
    if (!code) return '';
    return languageNames[code] || code.toUpperCase();
  }

  async function loadModules() {
    loading = true;
    try {
      const [local, updates] = await Promise.all([
        listModules(),
        checkRepoUpdates().catch(() => []),
      ]);
      modules = local;
      updatesAvailable = updates;
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loading = false;
    }
  }

  async function loadRepo() {
    loadingRepo = true;
    try {
      repoModules = await getRepoIndex();
    } catch (e) {
      console.warn('Could not fetch repo index:', e.message);
      repoModules = [];
    } finally {
      loadingRepo = false;
    }
  }

  onMount(() => {
    loadModules();
    loadRepo();
  });

  function handleView(m) {
    viewingModule = m;
    showModal = true;
  }

  async function handleInstall(m) {
    try {
      await installFromRepo(m.module_id, m.version);
      await loadModules();
    } catch (e) {
      errorStore.set(`Install failed: ${e.message}`);
    }
  }

  async function handleEnable(m) {
    try {
      await enableModule(m.module_id);
      await loadModules();
    } catch (e) {
      errorStore.set(`Enable failed: ${e.message}`);
    }
  }

  async function handleDisable(m) {
    try {
      await disableModule(m.module_id);
      await loadModules();
    } catch (e) {
      errorStore.set(`Disable failed: ${e.message}`);
    }
  }

  // Build a lookup of local modules by module_id
  let localMap = $derived(() => {
    const map = {};
    for (const m of modules) {
      map[m.module_id] = m;
    }
    return map;
  });

  // Merge repo + local into a unified list
  let allModules = $derived(() => {
    const seen = new Set();
    const result = [];

    // Start with repo modules (authoritative list of what exists)
    for (const rm of repoModules) {
      const local = localMap()[rm.module_id];
      result.push({
        ...rm,
        // Overlay local status
        installed: !!local,
        enabled: local?.enabled ?? false,
        installed_at: local?.installed_at ?? null,
        file_count: local?.file_count ?? 0,
        // Mark source
        _source: 'repo',
      });
      seen.add(rm.module_id);
    }

    // Add any local modules not in repo (custom/local-only)
    for (const lm of modules) {
      if (!seen.has(lm.module_id)) {
        result.push({
          ...lm,
          _source: 'local',
        });
      }
    }

    return result;
  });

  // All categories that have at least one module
  let categories = $derived(
    [...new Set(allModules().map((m) => canonicalCategory(m.category)).filter(Boolean))].sort()
  );

  // Modules in the active tab
  let tabModules = $derived(
    activeTab === 'all'
      ? allModules()
      : allModules().filter((m) => canonicalCategory(m.category) === activeTab),
  );

  // Apply sub-filters within the active tab
  let displayedModules = $derived(
    tabModules.filter((m) => {
      if (filterType && m.type !== filterType) return false;
      if (filterEnabled === 'enabled' && !m.enabled) return false;
      if (filterEnabled === 'disabled' && m.enabled) return false;
      if (filterStatus === 'installed' && !m.installed) return false;
      if (filterStatus === 'available' && m.installed) return false;
      if (filterStatus === 'updatable') {
        const hasUpdate = updatesAvailable.some((u) => u.module_id === m.module_id);
        if (!hasUpdate) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = resolveLocale(m.name, '').toLowerCase();
        const id = (m.module_id || '').toLowerCase();
        if (!name.includes(q) && !id.includes(q)) return false;
      }
      return true;
    }),
  );

  // Distinct types within the active tab
  let tabTypes = $derived(
    [...new Set(tabModules.map((m) => m.type).filter(Boolean))].sort(),
  );

  // Count per category for tab badges
  let categoryCounts = $derived(() => {
    const counts = { all: allModules().length };
    for (const m of allModules()) {
      const cat = canonicalCategory(m.category) || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  });

  let stats = $derived({
    total: allModules().length,
    enabled: allModules().filter((m) => m.enabled).length,
    installed: allModules().filter((m) => m.installed).length,
    available: allModules().filter((m) => !m.installed).length,
    updates: updatesAvailable.length,
  });

  // Group displayed modules by category (for 'all' tab)
  let groupedModules = $derived(() => {
    if (activeTab !== 'all') return [[activeTab, displayedModules]];
    const groups = {};
    for (const m of displayedModules) {
      const cat = canonicalCategory(m.category) || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'other') return 1;
      if (b === 'other') return -1;
      return (categoryInfo[a]?.label || a).localeCompare(categoryInfo[b]?.label || b);
    });
  });

  // Reset sub-filters when switching tabs
  function switchTab(tab) {
    activeTab = tab;
    filterType = '';
    filterEnabled = 'all';
    filterStatus = 'all';
    searchQuery = '';
    // Lazy-load string counts when switching to translations tab
    if (tab === 'translations') loadStringCounts();
  }
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{i18n.t('nav.modules')}</h1>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {stats.total} modules
        ({stats.installed} installed, {stats.available} available)
        {#if stats.updates > 0} &middot; {stats.updates} updates{/if}
      </p>
    </div>
    <div class="flex gap-2">
      <button class="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600" onclick={() => showRepoPanel = !showRepoPanel}>
        {showRepoPanel ? 'Hide Repo' : 'Show Repo'}
      </button>
    </div>
  </div>

  <!-- Repo panel -->
  {#if showRepoPanel}
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <h2 class="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
        danwa-modules Repository
      </h2>
      {#if loadingRepo}
        <p class="text-sm text-gray-600 dark:text-gray-400">Loading repo index...</p>
      {:else if repoModules.length === 0}
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Could not reach danwa-modules repo. Check connectivity or the
          <code class="font-mono">DANWA_MODULES_REPO</code> env var.
        </p>
      {:else}
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {repoModules.length} modules in remote index
          {#if updatesAvailable.length > 0} &middot; {updatesAvailable.length} updates available{/if}
        </p>
      {/if}
    </div>
  {/if}

  <!-- Category tabs -->
  <div class="border-b border-gray-200 dark:border-gray-700">
    <nav class="flex gap-1 overflow-x-auto" aria-label="Module categories">
      <button
        class="tab-btn"
        class:tab-active={activeTab === 'all'}
        onclick={() => switchTab('all')}
      >
        All
        <span class="tab-count">{stats.total}</span>
      </button>
      {#each categories as cat (cat)}
        <button
          class="tab-btn"
          class:tab-active={activeTab === cat}
          onclick={() => switchTab(cat)}
        >
          {categoryInfo[cat]?.icon || '📄'} {categoryInfo[cat]?.label || cat}
          <span class="tab-count">{categoryCounts()[cat] || 0}</span>
        </button>
      {/each}
    </nav>
  </div>

  <!-- Sub-filters for active tab -->
  <div class="flex gap-3 items-end flex-wrap">
    <div class="flex flex-col gap-1">
      <label class="text-xs text-gray-600 dark:text-gray-400" for="filter-search">Search</label>
      <input
        id="filter-search"
        type="text"
        placeholder="Name or ID..."
        class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm w-48"
        bind:value={searchQuery}
      />
    </div>
    {#if tabTypes.length > 1}
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-600 dark:text-gray-400" for="filter-type">Type</label>
        <select id="filter-type" class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm" bind:value={filterType}>
          <option value="">all</option>
          {#each tabTypes as typ (typ)}
            <option value={typ}>{typ}</option>
          {/each}
        </select>
      </div>
    {/if}
    <div class="flex flex-col gap-1">
      <label class="text-xs text-gray-600 dark:text-gray-400" for="filter-status">Status</label>
      <select id="filter-status" class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm" bind:value={filterStatus}>
        <option value="all">all</option>
        <option value="installed">installed</option>
        <option value="available">available (not installed)</option>
        {#if stats.updates > 0}
          <option value="updatable">updatable</option>
        {/if}
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
    <button class="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-600" onclick={() => { loadModules(); loadRepo(); }}>
      Refresh
    </button>
  </div>

  <!-- Content -->
  {#if loading}
    <div class="flex items-center justify-center h-32">
      <p class="text-gray-500 dark:text-gray-400">{i18n.t('common.loading')}</p>
    </div>
  {:else if displayedModules.length === 0}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-8 text-center">
      <p class="text-gray-500 dark:text-gray-400">{i18n.t('common.noData')}</p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each groupedModules() as [category, catModules] (category)}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          {#if activeTab === 'all'}
            <div class="px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {categoryInfo[category]?.icon || '📄'}
                {categoryInfo[category]?.label || category}
                <span class="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">({catModules.length})</span>
              </h3>
            </div>
          {/if}

          <!-- Translation modules: table layout (same as other categories) -->
          {#if canonicalCategory(category) === 'translations'}
            <table class="w-full text-sm text-left">
              <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700/30">
                <tr>
                  <th class="px-4 py-2">Language</th>
                  <th class="px-4 py-2">ID</th>
                  <th class="px-4 py-2">Strings</th>
                  <th class="px-4 py-2">Version</th>
                  <th class="px-4 py-2">Status</th>
                  <th class="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each catModules as m (m.module_id)}
                  {@const lang = m.language || ''}
                  <tr class="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                      <span class="text-lg leading-none mr-2">{FLAGS[lang] || '🌐'}</span>
                      {languageName(lang) || resolveLocale(m.name) || m.module_id}
                    </td>
                    <td class="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={m.module_id}>
                      {m.module_id}
                    </td>
                    <td class="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {#if stringCounts[m.module_id] != null}
                        {stringCounts[m.module_id]}
                      {:else if loadingCounts}
                        <span class="text-gray-400 dark:text-gray-500">…</span>
                      {:else}
                        {m.file_count || '—'}
                      {/if}
                    </td>
                    <td class="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400">{m.version || '—'}</td>
                    <td class="px-4 py-2.5">
                      {#if m.installed && m.enabled}
                        <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">● enabled</span>
                      {:else if m.installed}
                        <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">○ disabled</span>
                      {:else}
                        <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">↘ available</span>
                      {/if}
                    </td>
                    <td class="px-4 py-2.5 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <button class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors" onclick={() => handleView(m)}>
                          View
                        </button>
                        {#if !m.installed}
                          <button class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors" onclick={() => handleInstall(m)}>
                            Install
                          </button>
                        {:else if m.enabled}
                          <button class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors" onclick={() => handleDisable(m)}>
                            Disable
                          </button>
                        {:else}
                          <button class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors" onclick={() => handleEnable(m)}>
                            Enable
                          </button>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>

          <!-- All other modules: table layout -->
          {:else}
            <table class="w-full text-sm text-left">
              <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700/30">
                <tr>
                  <th class="px-4 py-2">Name</th>
                  <th class="px-4 py-2">ID</th>
                  <th class="px-4 py-2">Type</th>
                  <th class="px-4 py-2">Version</th>
                  <th class="px-4 py-2">Lang</th>
                  <th class="px-4 py-2">Status</th>
                  <th class="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each catModules as m (m.module_id)}
                  <tr class="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                      {resolveLocale(m.name) || m.module_id}
                    </td>
                    <td class="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={m.module_id}>
                      {m.module_id}
                    </td>
                    <td class="px-4 py-2.5">
                      <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {m.type || '—'}
                      </span>
                    </td>
                    <td class="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400">{m.version || '—'}</td>
                    <td class="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400">{m.language || '—'}</td>
                    <td class="px-4 py-2.5">
                      {#if m.installed && m.enabled}
                        <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">● enabled</span>
                      {:else if m.installed}
                        <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">○ disabled</span>
                      {:else}
                        <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">↘ available</span>
                      {/if}
                    </td>
                    <td class="px-4 py-2.5 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <button class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors" onclick={() => handleView(m)}>
                          View
                        </button>
                        {#if !m.installed}
                          <button class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors" onclick={() => handleInstall(m)}>
                            Install
                          </button>
                        {:else if m.enabled}
                          <button class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors" onclick={() => handleDisable(m)}>
                            Disable
                          </button>
                        {:else}
                          <button class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors" onclick={() => handleEnable(m)}>
                            Enable
                          </button>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<ModuleDetailModal
  moduleInfo={viewingModule}
  visible={showModal}
  onClose={() => { showModal = false; viewingModule = null; }}
/>

<style>
  .tab-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #6b7280;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
  }
  .tab-btn:hover {
    color: #374151;
  }
  :global(.dark) .tab-btn:hover {
    color: #d1d5db;
  }
  .tab-btn.tab-active {
    color: #2563eb;
    border-bottom-color: #2563eb;
  }
  :global(.dark) .tab-btn.tab-active {
    color: #60a5fa;
    border-bottom-color: #60a5fa;
  }
  .tab-count {
    font-size: 0.6875rem;
    padding: 1px 6px;
    border-radius: 9999px;
    background: #f3f4f6;
    color: #6b7280;
  }
  :global(.dark) .tab-count {
    background: #374151;
    color: #9ca3af;
  }
  .tab-btn.tab-active .tab-count {
    background: #dbeafe;
    color: #2563eb;
  }
  :global(.dark) .tab-btn.tab-active .tab-count {
    background: #1e3a5f;
    color: #60a5fa;
  }
</style>

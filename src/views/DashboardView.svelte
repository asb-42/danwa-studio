<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount, onDestroy } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import { getHealth, getMonitorActivity } from '../lib/admin/api.js';
  import { listLocalModules } from '../lib/publishing/api.js';
  import { listPromptTemplates } from '../lib/blueprint/api.js';

  let t = $derived((key, params) => i18n.t(key, params));

  let health = $state(null);
  let healthError = $state(null);
  let healthPollHandle = null;

  let stats = $state({
    modules: null,
    prompts: null,
    recentCalls: null,
  });
  let loading = $state(true);

  // Quick-jump routes (mirrors Sidebar order)
  const quickLinks = [
    { route: '/llm',          icon: '🤖', label: 'nav.llm' },
    { route: '/agents',       icon: '👤', label: 'nav.agents' },
    { route: '/prompts',      icon: '💬', label: 'nav.prompts' },
    { route: '/modules',      icon: '📦', label: 'nav.modules' },
    { route: '/modules/publish', icon: '🚀', label: 'Module Publishing' },
    { route: '/translations', icon: '🌐', label: 'nav.translations' },
    { route: '/exec',         icon: '▶️', label: 'nav.exec' },
    { route: '/diff',         icon: '🔀', label: 'nav.diff' },
    { route: '/replay',       icon: '⏪', label: 'nav.replay' },
    { route: '/proposals',    icon: '💡', label: 'nav.proposals' },
    { route: '/tenants',      icon: '🏢', label: 'nav.tenants' },
    { route: '/users',        icon: '👥', label: 'nav.users' },
    { route: '/health',       icon: '🖥️', label: 'nav.health' },
    { route: '/system',       icon: '⚙️', label: 'nav.system' },
  ];

  onMount(() => {
    refreshAll();
    healthPollHandle = setInterval(refreshHealth, 5000);
  });
  onDestroy(() => {
    if (healthPollHandle) clearInterval(healthPollHandle);
  });

  async function refreshAll() {
    loading = true;
    try {
      const [modules, prompts, calls] = await Promise.all([
        listLocalModules().catch(() => []),
        listPromptTemplates({ limit: 1 }).catch(() => []),
        getMonitorActivity({ limit: 1 }).catch(() => []),
      ]);
      stats.modules = modules.length;
      stats.prompts = Array.isArray(prompts) ? prompts.length : null;
      stats.recentCalls = Array.isArray(calls) ? calls.length : null;
    } catch (e) {
      // soft-fail
    } finally {
      loading = false;
    }
    await refreshHealth();
  }

  async function refreshHealth() {
    try {
      health = await getHealth();
      healthError = null;
    } catch (e) {
      healthError = e.message;
    }
  }

  function healthColor() {
    if (healthError) return 'bg-red-500';
    const s = (health?.status || '').toLowerCase();
    if (s === 'ok' || s === 'healthy' || s === 'up' || s === 'ready') return 'bg-green-500';
    if (s === 'degraded') return 'bg-yellow-500';
    if (s === 'down' || s === 'unhealthy' || s === 'error') return 'bg-red-500';
    return 'bg-gray-400';
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Danwa Studio</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
      Admin / Dev console for danwa. Pick a section from the sidebar or use a quick link below.
    </p>
  </div>

  <!-- Health banner -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
    <div class="flex items-center gap-3">
      <span class="inline-block w-4 h-4 rounded-full {healthColor()} {healthError ? '' : 'animate-pulse'}"></span>
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        {healthError ? 'Backend unreachable' : (health?.status || 'Checking…')}
      </h2>
      {#if health?.version}<span class="text-xs text-gray-500 dark:text-gray-400">v{health.version}</span>{/if}
      <button class="ml-auto text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded" onclick={refreshAll}>Refresh</button>
    </div>
    {#if healthError}
      <div class="mt-2 text-xs text-red-600 dark:text-red-400 font-mono">{healthError}</div>
    {/if}
  </div>

  <!-- Stat cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
      <div class="text-xs uppercase text-gray-500 dark:text-gray-400">Local modules</div>
      <div class="text-3xl font-semibold text-gray-900 dark:text-white mt-1">
        {loading ? '…' : (stats.modules ?? '—')}
      </div>
      <a class="text-xs text-blue-600 dark:text-blue-400 hover:underline" href="#/modules">Open ModulesView →</a>
    </div>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
      <div class="text-xs uppercase text-gray-500 dark:text-gray-400">Prompt templates</div>
      <div class="text-3xl font-semibold text-gray-900 dark:text-white mt-1">
        {loading ? '…' : (stats.prompts ?? '—')}
      </div>
      <a class="text-xs text-blue-600 dark:text-blue-400 hover:underline" href="#/prompts">Open PromptsView →</a>
    </div>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
      <div class="text-xs uppercase text-gray-500 dark:text-gray-400">Recent LLM calls (sampled)</div>
      <div class="text-3xl font-semibold text-gray-900 dark:text-white mt-1">
        {loading ? '…' : (stats.recentCalls ?? '—')}
      </div>
      <a class="text-xs text-blue-600 dark:text-blue-400 hover:underline" href="#/health">Open Server Health →</a>
    </div>
  </div>

  <!-- Quick links -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
    <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick links</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {#each quickLinks as l (l.route)}
        <a href={`#${l.route}`} class="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-sm">
          <span class="text-lg">{l.icon}</span>
          <span class="text-gray-700 dark:text-gray-300">{i18n.t(l.label) || l.route}</span>
        </a>
      {/each}
    </div>
  </div>
</div>

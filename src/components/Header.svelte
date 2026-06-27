<script>
  import { onMount } from 'svelte';
  import { i18n } from '../lib/i18n/loader.js';
  import { isDark, toggleDark } from '../lib/stores/theme.svelte.js';
  import { getMonitorActivity } from '../lib/admin/api.js';
  import LanguageSwitcher from './LanguageSwitcher.svelte';

  let { user = null, onlogout } = $props();

  // ── LLM Monitor state ────────────────────────────────────────────
  let llmActivity = $state({
    active_count: 0,
    active: [],
    recent: [],
    total_tokens_all_sessions: 0,
  });

  const isActive = $derived(llmActivity.active_count > 0);
  const totalTokens = $derived(llmActivity.total_tokens_all_sessions || 0);
  const failureCount = $derived(
    (llmActivity.recent || []).filter((r) => r.status === 'failed').length,
  );
  const showMonitor = $derived(isActive || totalTokens > 0);

  const tokenLevel = $derived(
    totalTokens >= 1_000_000
      ? 'critical'
      : totalTokens >= 500_000
        ? 'danger'
        : totalTokens >= 100_000
          ? 'warn'
          : 'normal',
  );

  function formatElapsed(seconds) {
    if (!seconds && seconds !== 0) return '';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m${s}s`;
  }

  function formatTokens(n) {
    if (!n) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  }

  // ── Polling ───────────────────────────────────────────────────────
  onMount(() => {
    const id = setInterval(async () => {
      try {
        const data = await getMonitorActivity({ limit: 5 });
        llmActivity = data;
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[Header] LLM activity poll failed:', e);
      }
    }, 4000);
    return () => clearInterval(id);
  });
</script>

<header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
  <div class="flex items-center gap-4">
    <h1 class="text-xl font-bold text-gray-900 dark:text-white">Danwa Studio</h1>
    <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Admin/Dev</span>

    <!-- ── LLM Monitor indicator ────────────────────────────────── -->
    {#if showMonitor}
      <div
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono
          {tokenLevel === 'critical' ? 'bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-600 animate-pulse' : ''}
          {tokenLevel === 'danger' ? 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700' : ''}
          {tokenLevel === 'warn' ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700' : ''}
          {tokenLevel === 'normal' ? 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700' : ''}
        "
      >
        {#if isActive}
          <!-- Spinning dot -->
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>

          <!-- Active call details -->
          {#if llmActivity.active[0]}
            {#if llmActivity.active[0].context}
              <span class="text-gray-500 dark:text-gray-400">{llmActivity.active[0].context}</span>
            {/if}
            <span class="text-gray-900 dark:text-white font-medium">{llmActivity.active[0].model}</span>
            <span class="text-gray-500 dark:text-gray-400">{formatElapsed(llmActivity.active[0].elapsed_s)}</span>
            {#if llmActivity.active_count > 1}
              <span class="text-blue-600 dark:text-blue-400">+{llmActivity.active_count - 1}</span>
            {/if}
          {:else}
            <span class="text-gray-500 dark:text-gray-400">Contacting LLM…</span>
          {/if}
        {/if}

        <!-- Token counter -->
        {#if totalTokens > 0}
          <span class="text-gray-500 dark:text-gray-400">{formatTokens(totalTokens)} tok</span>
        {/if}

        <!-- Failure indicator -->
        {#if failureCount > 0}
          <span class="text-red-600 dark:text-red-400">⚠{failureCount}</span>
        {/if}
      </div>
    {/if}
  </div>

  <div class="flex items-center gap-4">
    <LanguageSwitcher />

    <button
      class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
      onclick={toggleDark}
      title={isDark() ? 'Light mode' : 'Dark mode'}
    >
      {#if isDark()}
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      {/if}
    </button>

    {#if user}
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-600 dark:text-gray-300">{user.email}</span>
        <span class="px-2 py-1 text-xs font-medium rounded-full
          {user.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : ''}
          {user.role === 'editor' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
          {user.role === 'viewer' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : ''}
        ">
          {user.role}
        </span>
        <a href="#/profile" class="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">{i18n.t('nav.profile')}</a>
        <a href="#/my-keys" class="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">{i18n.t('nav.my_keys')}</a>
        <button class="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white" onclick={() => { if (onlogout) onlogout(); }}>
          {i18n.t('common.logout')}
        </button>
      </div>
    {/if}
  </div>
</header>

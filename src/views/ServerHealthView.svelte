<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount, onDestroy } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import { getHealth, getMonitorActivity, getServerLogs } from '../lib/admin/api.js';

  let t = $derived((key, params) => $i18n.t(key, params));

  let health = $state(null);
  let activity = $state([]);
  let logs = $state('');
  let healthError = $state(null);
  let pollHandle = null;

  // Filter
  let logLines = $state(200);
  let logLevel = $state('all');

  let filteredLogs = $derived.by(() => {
    if (logLevel === 'all') return logs;
    return logs
      .split('\n')
      .filter((l) => l.toUpperCase().includes(` ${logLevel.toUpperCase()} `) || l.startsWith(logLevel.toUpperCase()))
      .join('\n');
  });

  let healthColor = $derived.by(() => {
    if (!health) return 'bg-gray-400';
    if (healthError) return 'bg-red-500';
    const s = (health.status || '').toLowerCase();
    if (s === 'ok' || s === 'healthy' || s === 'up' || s === 'ready') return 'bg-green-500';
    if (s === 'degraded') return 'bg-yellow-500';
    if (s === 'down' || s === 'unhealthy' || s === 'error') return 'bg-red-500';
    return 'bg-blue-500';
  });

  onMount(() => {
    refreshAll();
    pollHandle = setInterval(refreshHealth, 5000);
  });
  onDestroy(() => {
    if (pollHandle) clearInterval(pollHandle);
  });

  async function refreshAll() {
    await Promise.all([refreshHealth(), refreshActivity(), refreshLogs()]);
  }

  async function refreshHealth() {
    try {
      health = await getHealth();
      healthError = null;
    } catch (e) {
      healthError = e.message;
    }
  }

  async function refreshActivity() {
    try {
      activity = await getMonitorActivity({ limit: 50 });
    } catch (e) {
      // soft-fail
    }
  }

  async function refreshLogs() {
    try {
      const resp = await getServerLogs({ lines: logLines, level: logLevel === 'all' ? null : logLevel });
      logs = typeof resp === 'string' ? resp : (resp.lines?.join('\n') || JSON.stringify(resp, null, 2));
    } catch (e) {
      // soft-fail
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{$i18n.t('nav.health')}</h1>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Live server status — auto-refreshes every 5 seconds.
      </p>
    </div>
    <button class="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm" onclick={refreshAll}>
      Refresh
    </button>
  </div>

  <!-- Health card -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
    <div class="flex items-center gap-3 mb-3">
      <span class="inline-block w-4 h-4 rounded-full {healthColor} {healthError ? '' : 'animate-pulse'}"></span>
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        {healthError ? 'Unhealthy' : (health?.status || 'Unknown')}
      </h2>
    </div>
    {#if healthError}
      <div class="form-error">{healthError}</div>
    {:else if health}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        {#if health.version}
          <div class="kv-card"><div class="kv-label">Version</div><div class="kv-value font-mono">{health.version}</div></div>
        {/if}
        {#if health.uptime}
          <div class="kv-card"><div class="kv-label">Uptime</div><div class="kv-value font-mono">{health.uptime}</div></div>
        {/if}
        {#if health.timestamp}
          <div class="kv-card"><div class="kv-label">Checked</div><div class="kv-value font-mono text-xs">{new Date(health.timestamp).toLocaleString()}</div></div>
        {/if}
        {#if health.environment}
          <div class="kv-card"><div class="kv-label">Env</div><div class="kv-value font-mono">{health.environment}</div></div>
        {/if}
      </div>
      {#if Object.keys(health).length > 5}
        <details class="mt-3">
          <summary class="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">Raw response</summary>
          <pre class="json-block mt-2">{JSON.stringify(health, null, 2)}</pre>
        </details>
      {/if}
    {/if}
  </div>

  <!-- Recent LLM activity -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
    <div class="p-3 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Recent LLM Activity ({activity.length})</h2>
    </div>
    {#if activity.length === 0}
      <p class="p-8 text-center text-gray-500 text-sm">{$i18n.t('common.noData')}</p>
    {:else}
      <div class="max-h-96 overflow-y-auto">
        <table class="w-full text-sm">
          <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700 sticky top-0">
            <tr>
              <th class="px-3 py-2 text-left">Time</th>
              <th class="px-3 py-2 text-left">Context</th>
              <th class="px-3 py-2 text-left">Provider</th>
              <th class="px-3 py-2 text-left">Model</th>
              <th class="px-3 py-2 text-right">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {#each activity as a (a.id || a.timestamp || Math.random())}
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-3 py-2 text-xs text-gray-500 font-mono">{a.timestamp?.slice(11, 19) || '—'}</td>
                <td class="px-3 py-2 text-xs">{a.context || a.session_id || '—'}</td>
                <td class="px-3 py-2 text-xs font-mono">{a.provider || '—'}</td>
                <td class="px-3 py-2 text-xs font-mono">{a.model || '—'}</td>
                <td class="px-3 py-2 text-xs text-right font-mono">{a.total_tokens || a.tokens || '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Server logs -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
    <div class="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white flex-1">Server logs</h2>
      <select class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" bind:value={logLevel} onchange={refreshLogs}>
        <option value="all">all levels</option>
        <option value="DEBUG">DEBUG</option>
        <option value="INFO">INFO</option>
        <option value="WARNING">WARNING</option>
        <option value="ERROR">ERROR</option>
      </select>
      <input type="number" min="50" max="5000" step="50" class="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" bind:value={logLines} onchange={refreshLogs} />
      <span class="text-xs text-gray-500">lines</span>
      <button class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded" onclick={refreshLogs}>Refresh</button>
    </div>
    <pre class="json-block max-h-96 overflow-auto">{filteredLogs || '(no logs)'}</pre>
  </div>
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
  .json-block {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    padding: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--color-text, #cdd6f4);
    margin: 0;
    white-space: pre;
  }
  .form-error {
    padding: 8px 12px; border-radius: 6px;
    background: rgba(243, 139, 168, 0.1); border: 1px solid var(--color-error, #f38ba8);
    color: var(--color-error, #f38ba8); font-size: 0.85rem;
  }
</style>

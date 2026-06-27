<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import { reloadProfiles, getServerLogs } from '../lib/admin/api.js';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  let t = $derived((key, params) => i18n.t(key, params));

  let lastReload = $state(null);
  let reloading = $state(false);
  let configSnapshot = $state(null);
  let pendingReload = $state(false);

  onMount(loadConfigSnapshot);

  async function loadConfigSnapshot() {
    // Use the health endpoint as a cheap "config fingerprint"
    try {
      const { getHealth } = await import('../lib/admin/api.js');
      configSnapshot = await getHealth();
    } catch {
      configSnapshot = { error: 'unreachable' };
    }
  }

  async function handleReload() {
    pendingReload = false;
    reloading = true;
    try {
      const resp = await reloadProfiles();
      lastReload = { at: new Date().toISOString(), resp };
      await loadConfigSnapshot();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      reloading = false;
    }
  }

  async function handleExportLogs() {
    try {
      const resp = await getServerLogs({ lines: 1000 });
      const text = typeof resp === 'string' ? resp : JSON.stringify(resp, null, 2);
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `danwa-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      errorStore.set(e.message);
    }
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{i18n.t('nav.system')}</h1>
    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
      System-wide maintenance actions and configuration overview.
    </p>
  </div>

  <!-- Maintenance actions -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 space-y-3">
    <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Maintenance actions</h2>
    <div class="grid grid-cols-2 gap-3">
      <div class="action-card">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Reload LLM profiles</h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Force the in-memory cache to refresh LLM profile definitions from disk/DB.
        </p>
        <button class="btn-primary mt-2" onclick={() => (pendingReload = true)} disabled={reloading}>
          {reloading ? 'Reloading…' : 'Reload now'}
        </button>
        {#if lastReload}
          <p class="text-xs text-green-600 dark:text-green-400 mt-1">✓ reloaded at {lastReload.at}</p>
        {/if}
      </div>
      <div class="action-card">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Export logs</h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Download the last 1000 server log lines as a text file for offline analysis.
        </p>
        <button class="btn-secondary mt-2" onclick={handleExportLogs}>
          Download .txt
        </button>
      </div>
    </div>
  </div>

  <!-- Config snapshot -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
    <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Configuration snapshot</h2>
    <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
      Read-only view of what the running server reports about itself. Use this to verify env-var changes after a restart.
    </p>
    {#if !configSnapshot}
      <p class="text-gray-500 dark:text-gray-400 text-sm">{i18n.t('common.loading')}</p>
    {:else}
      <pre class="json-block">{JSON.stringify(configSnapshot, null, 2)}</pre>
    {/if}
  </div>

  <!-- Documentation pointers -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
    <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Operator notes</h2>
    <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
      <li>Restart the backend after changing <code class="font-mono">backend/.env</code> or <code class="font-mono">pyproject.toml</code> extras.</li>
      <li>Use <code class="font-mono">Reload LLM profiles</code> after editing <code class="font-mono">profiles/</code> YAMLs while the server is running.</li>
      <li>For full module sync from <code class="font-mono">danwa-modules</code> use the ModulesView in this studio or the <code class="font-mono">manage.sh</code> scripts.</li>
    </ul>
  </div>
</div>

<ConfirmDialog
  open={pendingReload}
  title="Reload LLM profiles"
  message="This refreshes the in-memory LLM profile cache. In-flight requests will continue with the old cache until they complete."
  confirmLabel="Reload"
  cancelLabel={i18n.t('common.cancel')}
  variant="primary"
  onConfirm={handleReload}
  onCancel={() => (pendingReload = false)}
/>

<style>
  .action-card {
    background: rgba(137, 180, 250, 0.05);
    border: 1px solid var(--color-border, #313244);
    border-radius: 6px;
    padding: 12px;
  }
  .btn-primary {
    padding: 8px 16px; border: none; border-radius: 6px;
    background: var(--color-primary, #89b4fa); color: var(--color-bg, #1e1e2e);
    font-size: 0.875rem; font-weight: 600; cursor: pointer;
  }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary {
    padding: 8px 16px; border: 1px solid var(--color-border, #313244); border-radius: 6px;
    background: transparent; color: var(--color-text-muted, #6c7086);
    font-size: 0.875rem; cursor: pointer;
  }
  .btn-secondary:hover { background: var(--color-surface, #313244); }
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
    white-space: pre;
    margin: 0;
    max-height: 400px;
    overflow-y: auto;
  }
</style>

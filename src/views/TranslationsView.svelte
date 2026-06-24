<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount, onDestroy } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import {
    getSupportedLocales,
    getTranslationStats,
    getTranslationCoverage,
    getLocaleStrings,
    bulkTranslate,
    getBulkTranslateStatus,
    registerLocale,
    setString,
    deleteString,
  } from '../lib/i18n/api.js';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  let t = $derived((key, params) => i18n.t(key, params));

  // Overview state
  let locales = $state([]);
  let defaultLocale = $state('en');
  let rtlLocales = $state([]);
  let stats = $state({});
  let coverage = $state({});
  let loading = $state(false);

  // Expanded locale (per-locale strings table)
  let expandedLocale = $state(null);
  let detailStrings = $state([]);
  let detailLoading = $state(false);
  let detailFilter = $state(''); // 'all' | 'translated' | 'missing'

  // Edit / delete state
  let editingKey = $state(null);
  let editingValue = $state('');
  let saving = $state(false);
  let pendingDelete = $state(null); // { locale, key }

  // Bulk translate state
  let selectedLocales = $state(new Set());
  let bulkWipe = $state(false);
  let bulkInProgress = $state(false);
  let activeJobId = $state(null);
  let jobProgress = $state({ status: '', total: 0, completed: 0, current_key: '', current_locale: '' });
  let pollHandle = null;

  // Add-locale dialog
  let addOpen = $state(false);
  let newCode = $state('');
  let newName = $state('');
  let newRtl = $state(false);
  let addingLocale = $state(false);

  async function loadOverview() {
    loading = true;
    try {
      const [localesResp, statsResp, coverageResp] = await Promise.all([
        getSupportedLocales(),
        getTranslationStats().catch(() => ({})),
        getTranslationCoverage().catch(() => ({})),
      ]);
      defaultLocale = localesResp.default_locale;
      rtlLocales = localesResp.rtl_locales || [];
      locales = localesResp.locales || [];
      stats = statsResp || {};
      coverage = coverageResp || {};
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loading = false;
    }
  }

  onMount(loadOverview);
  onDestroy(() => {
    if (pollHandle) clearInterval(pollHandle);
  });

  function toggleLocaleSelection(code) {
    const next = new Set(selectedLocales);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    selectedLocales = next;
  }

  async function startBulkTranslate() {
    if (selectedLocales.size === 0) {
      errorStore.set('Pick at least one target locale');
      return;
    }
    bulkInProgress = true;
    try {
      const resp = await bulkTranslate({
        target_locales: [...selectedLocales],
        wipe_first: bulkWipe,
      });
      activeJobId = resp.job_id;
      // Start polling every 1.5s
      pollHandle = setInterval(pollJob, 1500);
      pollJob(); // immediate
    } catch (e) {
      errorStore.set(e.message);
      bulkInProgress = false;
    }
  }

  async function pollJob() {
    if (!activeJobId) return;
    try {
      const status = await getBulkTranslateStatus(activeJobId);
      jobProgress = status;
      if (status.status === 'completed' || status.status === 'failed') {
        clearInterval(pollHandle);
        pollHandle = null;
        activeJobId = null;
        bulkInProgress = false;
        await loadOverview(); // refresh coverage
        // If a locale was expanded, reload its strings
        if (expandedLocale) await loadLocaleStrings(expandedLocale);
      }
    } catch (e) {
      console.warn('Poll error:', e.message);
    }
  }

  async function handleExpand(localeCode) {
    if (expandedLocale === localeCode) {
      expandedLocale = null;
      detailStrings = [];
      return;
    }
    expandedLocale = localeCode;
    await loadLocaleStrings(localeCode);
  }

  async function loadLocaleStrings(localeCode) {
    detailLoading = true;
    try {
      const resp = await getLocaleStrings(localeCode);
      detailStrings = resp.strings || resp.entries || Object.entries(resp).map(([k, v]) =>
        typeof v === 'string' ? { key: k, value: v, status: 'translated' } : { key: k, ...v },
      );
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      detailLoading = false;
    }
  }

  let filteredStrings = $derived(
    detailStrings.filter((s) => {
      if (!detailFilter || detailFilter === 'all') return true;
      if (detailFilter === 'translated') return s.value && s.value.trim();
      if (detailFilter === 'missing') return !s.value || !s.value.trim();
      return true;
    }),
  );

  function startEdit(s) {
    editingKey = s.key;
    editingValue = s.value || '';
  }

  function cancelEdit() {
    editingKey = null;
    editingValue = '';
  }

  async function saveEdit() {
    if (!editingKey || !expandedLocale) return;
    saving = true;
    try {
      await setString(expandedLocale, editingKey, editingValue);
      await loadLocaleStrings(expandedLocale);
      cancelEdit();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      saving = false;
    }
  }

  function askDelete(s) {
    pendingDelete = { locale: expandedLocale, key: s.key };
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { locale, key } = pendingDelete;
    pendingDelete = null;
    try {
      await deleteString(locale, key);
      await loadLocaleStrings(locale);
    } catch (e) {
      errorStore.set(e.message);
    }
  }

  async function handleAddLocale() {
    if (!newCode || !newCode.trim()) {
      errorStore.set('Locale code required (e.g. "fr")');
      return;
    }
    addingLocale = true;
    try {
      await registerLocale({ locale: newCode.trim(), name: newName.trim() || null, is_rtl: newRtl });
      addOpen = false;
      newCode = '';
      newName = '';
      newRtl = false;
      await loadOverview();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      addingLocale = false;
    }
  }

  // Derived: progress percentage
  let jobPercent = $derived(
    jobProgress.total ? Math.round((jobProgress.completed / jobProgress.total) * 100) : 0,
  );

  function coveragePercent(loc) {
    const c = coverage?.[loc] ?? stats?.[loc]?.coverage;
    if (c == null) return null;
    return typeof c === 'number' ? Math.round(c * 100) : null;
  }

  function coverageColor(pct) {
    if (pct == null) return 'bg-gray-300';
    if (pct >= 90) return 'bg-green-500';
    if (pct >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{i18n.t('nav.translations')}</h1>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Default locale: <code class="font-mono">{defaultLocale}</code> · {locales.length} locales installed
        {#if rtlLocales.length}· {rtlLocales.length} RTL{/if}
      </p>
    </div>
    <div class="flex gap-2">
      <button class="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600" onclick={loadOverview}>
        Refresh
      </button>
      <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onclick={() => (addOpen = true)}>
        + Add Locale
      </button>
    </div>
  </div>

  <!-- Bulk translate panel -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
    <h2 class="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Bulk LLM-Translate</h2>
    <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
      Pick target locales below, then click Translate. The job runs asynchronously on the backend and updates coverage in real time.
    </p>

    {#if bulkInProgress && activeJobId}
      <div class="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
        <div class="text-xs text-blue-900 dark:text-blue-200 mb-1">
          Job <code class="font-mono">{activeJobId}</code> · {jobProgress.status}
          · {jobProgress.completed}/{jobProgress.total} ({jobPercent}%)
        </div>
        <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
          <div class="h-full bg-blue-500 transition-all" style="width: {jobPercent}%"></div>
        </div>
        {#if jobProgress.current_key}
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
            {jobProgress.current_locale} → {jobProgress.current_key}
          </div>
        {/if}
      </div>
    {/if}

    <div class="flex flex-wrap gap-2 mb-3">
      {#each locales as loc (loc.code)}
        <label class="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <input type="checkbox" checked={selectedLocales.has(loc.code)} onchange={() => toggleLocaleSelection(loc.code)} disabled={bulkInProgress} />
          <span>{loc.code}</span>
          <span class="text-gray-400">({loc.name})</span>
        </label>
      {/each}
    </div>

    <div class="flex items-center gap-3">
      <label class="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
        <input type="checkbox" bind:checked={bulkWipe} disabled={bulkInProgress} />
        <span>Wipe existing translations first</span>
      </label>
      <button
        class="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        onclick={startBulkTranslate}
        disabled={bulkInProgress || selectedLocales.size === 0}
      >
        {bulkInProgress ? 'Translating…' : `Translate ${selectedLocales.size} locale(s)`}
      </button>
    </div>
  </div>

  <!-- Locales table -->
  {#if loading}
    <div class="flex items-center justify-center h-32">
      <p class="text-gray-500">{i18n.t('common.loading')}</p>
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-4 py-3">Code</th>
            <th class="px-4 py-3">Name</th>
            <th class="px-4 py-3">Coverage</th>
            <th class="px-4 py-3">Source</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each locales as loc (loc.code)}
            {@const pct = coveragePercent(loc.code)}
            <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td class="px-4 py-3 font-mono text-xs">
                {loc.code}
                {#if loc.code === defaultLocale}<span class="ml-1 text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">default</span>{/if}
                {#if loc.is_rtl}<span class="ml-1 text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">RTL</span>{/if}
              </td>
              <td class="px-4 py-3 text-gray-900 dark:text-white" style:direction={loc.is_rtl ? 'rtl' : 'ltr'}>
                {loc.name}
              </td>
              <td class="px-4 py-3 w-48">
                {#if pct == null}
                  <span class="text-gray-400 text-xs">—</span>
                {:else}
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                      <div class="h-full {coverageColor(pct)} transition-all" style="width: {pct}%"></div>
                    </div>
                    <span class="font-mono text-xs text-gray-600 dark:text-gray-400 w-10 text-right">{pct}%</span>
                  </div>
                {/if}
              </td>
              <td class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{loc.coverage || '—'}</td>
              <td class="px-4 py-3 text-right">
                <button class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors" onclick={() => handleExpand(loc.code)}>
                  {expandedLocale === loc.code ? 'Close' : 'Strings'}
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- Per-locale strings panel -->
  {#if expandedLocale}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
          Strings for <code class="font-mono">{expandedLocale}</code>
          {#if rtlLocales.includes(expandedLocale)}<span class="ml-2 text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">RTL</span>{/if}
        </h2>
        <div class="flex gap-2">
          <select class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-xs" bind:value={detailFilter}>
            <option value="all">All ({detailStrings.length})</option>
            <option value="translated">Translated</option>
            <option value="missing">Missing</option>
          </select>
          <button class="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600" onclick={() => loadLocaleStrings(expandedLocale)}>
            Refresh
          </button>
        </div>
      </div>

      {#if detailLoading}
        <p class="text-gray-500 text-sm">{i18n.t('common.loading')}</p>
      {:else if filteredStrings.length === 0}
        <p class="text-gray-500 text-sm">No strings match the current filter.</p>
      {:else}
        <div class="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
          <table class="w-full text-sm">
            <tbody>
              {#each filteredStrings as s (s.key)}
                <tr class="border-b dark:border-gray-700 last:border-b-0">
                  <td class="px-3 py-2 font-mono text-xs text-gray-500 dark:text-gray-400 align-top w-1/3">
                    {s.key}
                  </td>
                  <td class="px-3 py-2" style:direction={rtlLocales.includes(expandedLocale) ? 'rtl' : 'ltr'}>
                    {#if editingKey === s.key}
                      <div class="flex gap-2">
                        <input class="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-xs" bind:value={editingValue} />
                        <button class="px-2 py-1 text-xs bg-blue-600 text-white rounded" onclick={saveEdit} disabled={saving}>Save</button>
                        <button class="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded" onclick={cancelEdit}>Cancel</button>
                      </div>
                    {:else}
                      <div class="flex items-start gap-2">
                        <span class="flex-1 {s.value ? 'text-gray-900 dark:text-white' : 'text-gray-400 italic'}">
                          {s.value || '(empty)'}
                        </span>
                        <button class="text-xs text-blue-600 dark:text-blue-400 hover:underline" onclick={() => startEdit(s)}>Edit</button>
                        <button class="text-xs text-red-600 dark:text-red-400 hover:underline" onclick={() => askDelete(s)}>Delete</button>
                      </div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</div>

<ConfirmDialog
  open={pendingDelete !== null}
  title="Delete string"
  message={pendingDelete ? `Delete "${pendingDelete.key}" from ${pendingDelete.locale}?` : ''}
  confirmLabel={i18n.t('common.delete')}
  cancelLabel={i18n.t('common.cancel')}
  variant="danger"
  onConfirm={confirmDelete}
  onCancel={() => (pendingDelete = null)}
/>

{#if addOpen}
  <div class="modal-overlay" role="dialog" tabindex="-1" aria-modal="true" onkeydown={(e) => { if (e.key === 'Escape') addOpen = false; }}>
    <div class="modal-container">
      <div class="modal-header">
        <h2 class="modal-title">Add Custom Locale</h2>
        <button class="close-btn" onclick={() => (addOpen = false)}>✕</button>
      </div>
      <div class="modal-body">
        <div class="form-field">
          <label class="field-label" for="add-code">Code (BCP-47, e.g. "fr", "pt-BR")</label>
          <input id="add-code" type="text" class="field-input" bind:value={newCode} placeholder="fr" />
        </div>
        <div class="form-field">
          <label class="field-label" for="add-name">Display Name (optional)</label>
          <input id="add-name" type="text" class="field-input" bind:value={newName} placeholder="Français" />
        </div>
        <div class="form-field form-check">
          <label class="check-label">
            <input type="checkbox" bind:checked={newRtl} />
            <span>Right-to-left (RTL) script</span>
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick={() => (addOpen = false)} disabled={addingLocale}>{i18n.t('common.cancel')}</button>
        <button class="btn-primary" onclick={handleAddLocale} disabled={addingLocale}>
          {addingLocale ? '…' : i18n.t('common.create')}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal-container {
    background: var(--color-bg, #1e1e2e);
    border-radius: 8px;
    max-width: 480px;
    width: 92%;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border, #313244);
  }
  .modal-title { font-size: 1.1rem; font-weight: 600; color: var(--color-text, #cdd6f4); margin: 0; }
  .close-btn { background: none; border: none; color: var(--color-text-muted, #6c7086); font-size: 1.25rem; cursor: pointer; padding: 4px 8px; border-radius: 4px; }
  .close-btn:hover { background: var(--color-surface, #313244); }
  .modal-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
  .form-field { display: flex; flex-direction: column; gap: 4px; }
  .field-label { font-size: 0.8rem; font-weight: 500; color: var(--color-text, #cdd6f4); }
  .field-input {
    padding: 8px 12px;
    border: 1px solid var(--color-border, #313244);
    border-radius: 6px;
    background: var(--color-surface, #313244);
    color: var(--color-text, #cdd6f4);
    font-size: 0.875rem;
    font-family: inherit;
  }
  .field-input:focus { outline: none; border-color: var(--color-primary, #89b4fa); }
  .form-check { flex-direction: row; align-items: center; }
  .check-label { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; color: var(--color-text, #cdd6f4); cursor: pointer; }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid var(--color-border, #313244);
  }
  .btn-secondary {
    padding: 8px 16px;
    border: 1px solid var(--color-border, #313244);
    border-radius: 6px;
    background: transparent;
    color: var(--color-text-muted, #6c7086);
    font-size: 0.875rem;
    cursor: pointer;
  }
  .btn-secondary:hover { background: var(--color-surface, #313244); }
  .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    background: var(--color-primary, #89b4fa);
    color: var(--color-bg, #1e1e2e);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-primary:hover { opacity: 0.9; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

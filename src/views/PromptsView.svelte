<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import { listPromptTemplates } from '../lib/blueprint/api.js';
  import PromptTemplateModal from '../components/blueprint/PromptTemplateModal.svelte';

  let t = $derived((key, params) => i18n.t(key, params));

  let templates = $state([]);
  let loading = $state(false);
  let showModal = $state(false);
  let viewingTemplate = $state(null);

  // Read-only: prompt templates live as versioned files in danwa-modules.
  // The backend returns `_readonly: true` for every item (see
  // `backend.services.module_profile_sync._mark_readonly`).
  let readOnly = $derived(
    templates.length === 0
      ? true // safe default before load
      : templates.every((tpl) => tpl._readonly === true || tpl.readonly === true),
  );

  // Filter inputs
  let filterRole = $state('');
  let filterVariant = $state('');

  async function loadTemplates() {
    loading = true;
    try {
      templates = await listPromptTemplates({
        limit: 100,
        role: filterRole || null,
        variant: filterVariant || null,
      });
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loading = false;
    }
  }

  onMount(loadTemplates);

  function handleView(tpl) {
    viewingTemplate = tpl;
    showModal = true;
  }

  function truncate(s, n = 80) {
    if (!s) return '—';
    return s.length > n ? s.slice(0, n) + '…' : s;
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{i18n.t('prompts.title')}</h1>
      {#if readOnly}
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          🔒 Read-only — prompts live in <code class="font-mono">danwa-modules</code>; edit there to change.
        </p>
      {/if}
    </div>
  </div>

  <!-- Filter bar -->
  <div class="flex gap-3 items-end">
    <div class="flex flex-col gap-1">
      <label class="text-xs text-gray-600 dark:text-gray-400" for="filter-role">{i18n.t('prompts.role')}</label>
      <input id="filter-role" type="text" class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" bind:value={filterRole} placeholder="any" />
    </div>
    <div class="flex flex-col gap-1">
      <label class="text-xs text-gray-600 dark:text-gray-400" for="filter-variant">{i18n.t('prompts.variant')}</label>
      <input id="filter-variant" type="text" class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" bind:value={filterVariant} placeholder="default" />
    </div>
    <button class="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-600" onclick={loadTemplates}>
      {i18n.t('common.filter')}
    </button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-32">
      <p class="text-gray-500 dark:text-gray-400">{i18n.t('common.loading')}</p>
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      {#if templates.length === 0}
        <div class="p-8 text-center">
          <p class="text-gray-500 dark:text-gray-400 mb-2">{i18n.t('common.noData')}</p>
          <p class="text-xs text-gray-400 dark:text-gray-500">No prompt-template modules enabled. Enable one in <code>danwa-modules</code> (type: <code>prompt-variant</code>).</p>
        </div>
      {:else}
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-3">{i18n.t('config.name')}</th>
              <th class="px-4 py-3">{i18n.t('prompts.role')}</th>
              <th class="px-4 py-3">{i18n.t('prompts.variant')}</th>
              <th class="px-4 py-3">Lang</th>
              <th class="px-4 py-3">{i18n.t('prompts.content')}</th>
              <th class="px-4 py-3">Tags</th>
              <th class="px-4 py-3 text-right">{i18n.t('config.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {#each templates as tpl (tpl.id)}
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {tpl.name}
                  <span class="block text-xs text-gray-400 dark:text-gray-500 font-mono">{tpl.id}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {tpl.role || '—'}
                  </span>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{tpl.variant || 'default'}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{tpl.language || 'en'}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400 max-w-md" title={tpl.content}>
                  {truncate(tpl.content, 80)}
                </td>
                <td class="px-4 py-3">
                  {#each (tpl.tags || []) as tag (tag)}
                    <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mr-1">
                      {tag}
                    </span>
                  {/each}
                </td>
                <td class="px-4 py-3 text-right space-x-1">
                  <button class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors" onclick={() => handleView(tpl)}>
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

<PromptTemplateModal
  template={viewingTemplate}
  visible={showModal}
  readOnly={true}
  onSuccess={() => {}}
  onClose={() => { showModal = false; viewingTemplate = null; }}
/>

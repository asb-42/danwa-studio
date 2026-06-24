<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error } from '../lib/stores.js';
  import {
    listWorkflowTemplates,
    getWorkflowTemplate,
    instantiateWorkflowTemplate,
    deleteWorkflowTemplate,
  } from '../lib/blueprint/api.js';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import TemplateInstantiateModal from '../components/blueprint/TemplateInstantiateModal.svelte';

  let t = $derived((key, params) => i18n.t(key, params));

  let templates = $state([]);
  let loading = $state(false);
  let selectedTemplateId = $state(null);
  let showInstantiateModal = $state(false);
  let pendingDeleteId = $state(null);

  async function loadTemplates() {
    loading = true;
    try {
      templates = await listWorkflowTemplates();
    } catch (e) {
      error.set(e.message);
    } finally {
      loading = false;
    }
  }

  onMount(loadTemplates);

  function handleInstantiate(template) {
    selectedTemplateId = template.id;
    showInstantiateModal = true;
  }

  function handleDelete(id) {
    pendingDeleteId = id;
  }

  async function confirmDelete() {
    const id = pendingDeleteId;
    pendingDeleteId = null;
    if (!id) return;
    try {
      await deleteWorkflowTemplate(id);
      await loadTemplates();
    } catch (e) {
      error.set(e.message);
    }
  }

  async function handleInstantiated(wf) {
    showInstantiateModal = false;
    selectedTemplateId = null;
    // Navigate to blueprint canvas with the new workflow
    window.location.hash = `#/blueprints/${wf.id}`;
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900">{i18n.t('nav.workflow_templates')}</h1>
    <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onclick={() => window.location.hash = '#/blueprints'}>
      {i18n.t('common.create')} Blueprint
    </button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-32">
      <p class="text-gray-500">{i18n.t('common.loading')}</p>
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      {#if templates.length === 0}
        <div class="p-8 text-center">
          <p class="text-gray-500 dark:text-gray-400 mb-4">{i18n.t('common.noData') || 'No workflow templates found.'}</p>
          <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onclick={() => window.location.hash = '#/blueprints'}>
            {i18n.t('common.create')} First Blueprint
          </button>
        </div>
      {:else}
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-3">{i18n.t('config.name')}</th>
              <th class="px-4 py-3">{i18n.t('config.category')}</th>
              <th class="px-4 py-3">{i18n.t('config.description')}</th>
              <th class="px-4 py-3 text-right">{i18n.t('config.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {#each templates as template (template.id)}
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{template.name}</td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {template.category || 'general'}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">{template.description || '—'}</td>
                <td class="px-4 py-3 text-right space-x-1">
                  <button class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors" onclick={() => handleInstantiate(template)}>
                    {i18n.t('config.instantiate') || 'Instantiate'}
                  </button>
                  <button class="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors" onclick={() => handleDelete(template.id)}>
                    {i18n.t('common.delete')}
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

<ConfirmDialog
  open={pendingDeleteId !== null}
  title={i18n.t('common.delete')}
  message={i18n.t('common.confirmDelete') || 'Are you sure you want to delete this template?'}
  confirmLabel={i18n.t('common.delete')}
  cancelLabel={i18n.t('common.cancel')}
  variant="danger"
  onConfirm={confirmDelete}
  onCancel={() => (pendingDeleteId = null)}
/>

<TemplateInstantiateModal
  templateId={selectedTemplateId}
  visible={showInstantiateModal}
  onSuccess={handleInstantiated}
  onClose={() => { showInstantiateModal = false; selectedTemplateId = null; }}
/>
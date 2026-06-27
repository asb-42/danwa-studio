<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import {
    listAgentBlueprints,
    createAgentBlueprint,
    updateAgentBlueprint,
    deleteAgentBlueprint,
  } from '../lib/blueprint/api.js';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import AgentBlueprintModal from '../components/blueprint/AgentBlueprintModal.svelte';

  let t = $derived((key, params) => i18n.t(key, params));

  let blueprints = $state([]);
  let loading = $state(false);
  let showModal = $state(false);
  let editingBlueprint = $state(null);
  let pendingDeleteId = $state(null);

  async function loadBlueprints() {
    loading = true;
    try {
      // listAgentBlueprints defaults active_only=true; show all for the editor
      blueprints = await listAgentBlueprints({ limit: 100, active_only: false });
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loading = false;
    }
  }

  onMount(loadBlueprints);

  function handleCreate() {
    editingBlueprint = null;
    showModal = true;
  }

  function handleEdit(bp) {
    editingBlueprint = bp;
    showModal = true;
  }

  function handleDelete(id) {
    pendingDeleteId = id;
  }

  async function confirmDelete() {
    const id = pendingDeleteId;
    pendingDeleteId = null;
    if (!id) return;
    try {
      await deleteAgentBlueprint(id);
      await loadBlueprints();
    } catch (e) {
      errorStore.set(e.message);
    }
  }

  async function handleSaved() {
    showModal = false;
    editingBlueprint = null;
    await loadBlueprints();
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{i18n.t('agents.title')}</h1>
    <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onclick={handleCreate}>
      {i18n.t('agents.create')}
    </button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-32">
      <p class="text-gray-500 dark:text-gray-400">{i18n.t('common.loading')}</p>
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      {#if blueprints.length === 0}
        <div class="p-8 text-center">
          <p class="text-gray-500 dark:text-gray-400 mb-4">{i18n.t('common.noData')}</p>
          <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onclick={handleCreate}>
            {i18n.t('agents.create')}
          </button>
        </div>
      {:else}
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-3">{i18n.t('config.name')}</th>
              <th class="px-4 py-3">LLM</th>
              <th class="px-4 py-3">Role</th>
              <th class="px-4 py-3">Tone</th>
              <th class="px-4 py-3">Tags</th>
              <th class="px-4 py-3">Active</th>
              <th class="px-4 py-3 text-right">{i18n.t('config.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {#each blueprints as bp (bp.id)}
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {bp.name}
                  <span class="block text-xs text-gray-400 dark:text-gray-500 font-mono">{bp.id}</span>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{bp.llm_profile_id || '—'}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{bp.role_definition_id || '—'}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{bp.tone_profile_id || '—'}</td>
                <td class="px-4 py-3">
                  {#each (bp.tags || []) as tag (tag)}
                    <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mr-1">
                      {tag}
                    </span>
                  {/each}
                </td>
                <td class="px-4 py-3">
                  {#if bp.is_active}
                    <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">●</span>
                  {:else}
                    <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">○</span>
                  {/if}
                </td>
                <td class="px-4 py-3 text-right space-x-1">
                  <button class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors" onclick={() => handleEdit(bp)}>
                    {i18n.t('common.edit')}
                  </button>
                  <button class="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors" onclick={() => handleDelete(bp.id)}>
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
  title={i18n.t('agents.delete')}
  message={i18n.t('agents.confirmDelete')}
  confirmLabel={i18n.t('common.delete')}
  cancelLabel={i18n.t('common.cancel')}
  variant="danger"
  onConfirm={confirmDelete}
  onCancel={() => (pendingDeleteId = null)}
/>

<AgentBlueprintModal
  blueprint={editingBlueprint}
  visible={showModal}
  onSuccess={handleSaved}
  onClose={() => { showModal = false; editingBlueprint = null; }}
/>

<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import {
    listBlueprintLLMProfiles,
    getBlueprintLLMProfile,
    createBlueprintLLMProfile,
    updateBlueprintLLMProfile,
    deleteBlueprintLLMProfile,
  } from '../lib/blueprint/api.js';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import LLMProfileModal from '../components/blueprint/LLMProfileModal.svelte';

  let t = $derived((key, params) => i18n.t(key, params));

  let profiles = $state([]);
  let loading = $state(false);
  let showModal = $state(false);
  let editingProfile = $state(null);
  let pendingDeleteId = $state(null);

  async function loadProfiles() {
    loading = true;
    try {
      profiles = await listBlueprintLLMProfiles({ limit: 100 });
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loading = false;
    }
  }

  onMount(loadProfiles);

  function handleCreate() {
    editingProfile = null;
    showModal = true;
  }

  function handleEdit(profile) {
    editingProfile = profile;
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
      await deleteBlueprintLLMProfile(id);
      await loadProfiles();
    } catch (e) {
      errorStore.set(e.message);
    }
  }

  async function handleSaved() {
    showModal = false;
    editingProfile = null;
    await loadProfiles();
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900">{i18n.t('llm_profiles.title')}</h1>
    <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onclick={handleCreate}>
      {i18n.t('llm_profiles.create')}
    </button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-32">
      <p class="text-gray-500">{i18n.t('common.loading')}</p>
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      {#if profiles.length === 0}
        <div class="p-8 text-center">
          <p class="text-gray-500 dark:text-gray-400 mb-4">{i18n.t('common.noData')}</p>
          <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onclick={handleCreate}>
            {i18n.t('llm_profiles.create')}
          </button>
        </div>
      {:else}
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-3">{i18n.t('config.name')}</th>
              <th class="px-4 py-3">{i18n.t('config.provider')}</th>
              <th class="px-4 py-3">{i18n.t('config.model')}</th>
              <th class="px-4 py-3">{i18n.t('config.profileType')}</th>
              <th class="px-4 py-3 text-right">{i18n.t('config.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {#each profiles as profile (profile.id)}
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{profile.name}</td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {profile.provider}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-sm">{profile.model || '—'}</td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {profile.profile_type || 'text'}
                  </span>
                </td>
                <td class="px-4 py-3 text-right space-x-1">
                  <button class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors" onclick={() => handleEdit(profile)}>
                    {i18n.t('common.edit')}
                  </button>
                  <button class="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors" onclick={() => handleDelete(profile.id)}>
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
  title={i18n.t('llm_profiles.delete')}
  message={i18n.t('llm_profiles.confirmDelete')}
  confirmLabel={i18n.t('common.delete')}
  cancelLabel={i18n.t('common.cancel')}
  variant="danger"
  onConfirm={confirmDelete}
  onCancel={() => (pendingDeleteId = null)}
/>

<LLMProfileModal
  profile={editingProfile}
  visible={showModal}
  onSuccess={handleSaved}
  onClose={() => { showModal = false; editingProfile = null; }}
/>
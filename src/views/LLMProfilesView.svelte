<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore, selectedLLMProfile } from '../lib/stores.js';
  import {
    listBlueprintLLMProfiles,
    createBlueprintLLMProfile,
    updateBlueprintLLMProfile,
    deleteBlueprintLLMProfile,
  } from '../lib/blueprint/api.js';
  import {
    getServiceLLMConfig,
    setServiceLLM,
    getServiceEligibleProfiles,
  } from '../lib/api/settings.js';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import LLMProfileModal from '../components/blueprint/LLMProfileModal.svelte';

  let t = $derived((key, params) => i18n.t(key, params));

  let profiles = $state([]);
  let loading = $state(false);
  let showModal = $state(false);
  let editingProfile = $state(null);
  let pendingDeleteId = $state(null);

  // Utility LLM state
  let serviceLLMConfig = $state({});
  let serviceEligible = $state([]);
  let loadingService = $state(false);
  let statusMessage = $state('');

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

  async function loadServiceData() {
    try {
      const [config, eligible] = await Promise.allSettled([
        getServiceLLMConfig(),
        getServiceEligibleProfiles(),
      ]);
      if (config.status === 'fulfilled') serviceLLMConfig = config.value || {};
      if (eligible.status === 'fulfilled') serviceEligible = eligible.value || [];
    } catch (e) {
      console.warn('Failed to load service LLM data:', e);
    }
  }

  onMount(async () => {
    await Promise.all([loadProfiles(), loadServiceData()]);
  });

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

  // Default LLM: click profile name to select (client-side only, persisted to localStorage)
  function selectDefaultLLM(profileId) {
    selectedLLMProfile.set(profileId);
  }

  // Utility LLM: toggle checkbox
  async function toggleServiceLLM(profileId, isChecked) {
    loadingService = true;
    statusMessage = '';
    try {
      if (isChecked) {
        // Validate eligibility first
        const elig = serviceEligible.find((p) => p.id === profileId);
        if (elig && !elig.service_eligible) {
          errorStore.set(`"${elig.name}" is not suitable as Utility LLM: ${elig.eligibility_reason}`);
          loadingService = false;
          return;
        }
        await setServiceLLM(profileId);
        const prof = profiles.find((p) => p.id === profileId);
        statusMessage = `Utility LLM set to "${prof?.name || profileId}"`;
      } else {
        await setServiceLLM('');
        statusMessage = 'Utility LLM cleared';
      }
      await loadServiceData();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loadingService = false;
    }
  }

  function getEligibility(profileId) {
    return serviceEligible.find((p) => p.id === profileId);
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900">{i18n.t('llm_profiles.title')}</h1>
    <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onclick={handleCreate}>
      {i18n.t('llm_profiles.create')}
    </button>
  </div>

  {#if statusMessage}
    <div class="px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
      {statusMessage}
    </div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center h-32">
      <p class="text-gray-500 dark:text-gray-400">{i18n.t('common.loading')}</p>
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
              <th class="px-4 py-3">⭐ {t('config.default') || 'Default'}</th>
              <th class="px-4 py-3">🔧 {t('service.utility') || 'Utility'}</th>
              <th class="px-4 py-3">{i18n.t('config.name')}</th>
              <th class="px-4 py-3">{i18n.t('config.provider')}</th>
              <th class="px-4 py-3">{i18n.t('config.model')}</th>
              <th class="px-4 py-3">{i18n.t('config.profileType')}</th>
              <th class="px-4 py-3 text-right">{i18n.t('config.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {#each profiles as profile (profile.id)}
              {@const isDefault = $selectedLLMProfile === profile.id}
              {@const isUtility = serviceLLMConfig.service_llm_profile_id === profile.id}
              {@const elig = getEligibility(profile.id)}
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 {isDefault ? 'bg-blue-50 dark:bg-blue-900/20' : ''}">
                <!-- Default LLM column -->
                <td class="px-4 py-3 text-center">
                  {#if isDefault}
                    <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">✓ default</span>
                  {:else}
                    <button
                      class="text-xs px-2 py-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      onclick={() => selectDefaultLLM(profile.id)}
                      title="Click to set as default LLM"
                    >
                      set default
                    </button>
                  {/if}
                </td>
                <!-- Utility LLM column -->
                <td class="px-4 py-3 text-center">
                  {#if elig}
                    {#if elig.service_eligible || isUtility}
                      <div class="flex flex-col items-center gap-0.5">
                        <input
                          type="checkbox"
                          checked={isUtility}
                          onchange={(e) => toggleServiceLLM(profile.id, e.target.checked)}
                          disabled={loadingService}
                          class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        {#if !elig.service_eligible}
                          <span class="text-[10px] text-amber-500 dark:text-amber-400" title={elig.eligibility_reason}>⚠️</span>
                        {/if}
                      </div>
                    {:else}
                      <span class="text-[10px] text-gray-400" title={elig.eligibility_reason}>⚠️</span>
                    {/if}
                  {:else}
                    <span class="text-xs text-gray-400">—</span>
                  {/if}
                </td>
                <!-- Profile info columns -->
                <td class="px-4 py-3 font-medium">
                  <button
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    onclick={() => selectDefaultLLM(profile.id)}
                  >
                    {profile.name}
                  </button>
                  {#if isDefault}
                    <span class="ml-2 text-xs text-green-600 dark:text-green-400">✓ {t('config.active') || 'active'}</span>
                  {/if}
                </td>
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

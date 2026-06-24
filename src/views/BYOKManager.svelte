<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import { listUserKeys, setUserKey, deleteUserKey, deleteAllUserKeys } from '../lib/admin/api.js';
  import { listBlueprintLLMProfiles } from '../lib/blueprint/api.js';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  let t = $derived((key, params) => i18n.t(key, params));

  let keys = $state([]);
  let llmProfiles = $state([]);
  let loading = $state(false);

  // Form
  let showForm = $state(false);
  let formProfileId = $state('');
  let formKey = $state('');
  let formProvider = $state('openrouter');
  let formLabel = $state('');
  let saving = $state(false);

  let pendingDelete = $state(null);
  let pendingWipe = $state(false);

  onMount(loadAll);

  async function loadAll() {
    loading = true;
    try {
      [keys, llmProfiles] = await Promise.all([
        listUserKeys().catch(() => []),
        listBlueprintLLMProfiles({ limit: 200 }).catch(() => []),
      ]);
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loading = false;
    }
  }

  async function handleSave() {
    if (!formProfileId || !formKey) {
      errorStore.set('profile_id and key are required');
      return;
    }
    saving = true;
    try {
      await setUserKey({
        profile_id: formProfileId,
        api_key: formKey,
        provider: formProvider,
        label: formLabel || null,
      });
      showForm = false;
      formProfileId = '';
      formKey = '';
      formProvider = 'openrouter';
      formLabel = '';
      await loadAll();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      saving = false;
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.profile_id || pendingDelete.id;
    pendingDelete = null;
    try {
      await deleteUserKey(id);
      await loadAll();
    } catch (e) {
      errorStore.set(e.message);
    }
  }

  async function confirmWipe() {
    pendingWipe = false;
    try {
      await deleteAllUserKeys();
      await loadAll();
    } catch (e) {
      errorStore.set(e.message);
    }
  }

  function maskKey(k) {
    if (!k) return '—';
    if (k.length < 12) return '••••';
    return k.slice(0, 4) + '••••••••' + k.slice(-4);
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">BYOK Manager</h1>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Manage your per-user API keys (Bring Your Own Key) — they override the server's
        environment variables for the matching LLM profile.
      </p>
    </div>
    <div class="flex gap-2">
      <button class="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm" onclick={loadAll}>
        Refresh
      </button>
      {#if keys.length > 0}
        <button class="px-3 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-sm" onclick={() => (pendingWipe = true)}>
          Wipe all
        </button>
      {/if}
      <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onclick={() => (showForm = !showForm)}>
        {showForm ? 'Close' : '+ Add Key'}
      </button>
    </div>
  </div>

  {#if showForm}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Add / update API key</h2>
      <div class="grid grid-cols-2 gap-2">
        <div class="form-field">
          <label class="field-label" for="k-profile">LLM Profile *</label>
          <select id="k-profile" class="field-input" bind:value={formProfileId}>
            <option value="">— select a profile —</option>
            {#each llmProfiles as p (p.id)}
              <option value={p.id}>{p.name} ({p.provider}/{p.model})</option>
            {/each}
          </select>
        </div>
        <div class="form-field">
          <label class="field-label" for="k-provider">Provider</label>
          <input id="k-provider" type="text" class="field-input" bind:value={formProvider} placeholder="openrouter" />
        </div>
        <div class="form-field col-span-2">
          <label class="field-label" for="k-label">Label (optional)</label>
          <input id="k-label" type="text" class="field-input" bind:value={formLabel} placeholder="e.g. my-paid-account" />
        </div>
        <div class="form-field col-span-2">
          <label class="field-label" for="k-key">API key *</label>
          <input id="k-key" type="password" class="field-input font-mono" bind:value={formKey} placeholder="sk-…" />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Stored server-side, never echoed in API responses.
          </p>
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <button class="btn-secondary" onclick={() => (showForm = false)}>Cancel</button>
        <button class="btn-primary" onclick={handleSave} disabled={saving}>
          {saving ? '…' : 'Save Key'}
        </button>
      </div>
    </div>
  {/if}

  {#if loading}
    <p class="text-gray-500 text-sm">{i18n.t('common.loading')}</p>
  {:else if keys.length === 0}
    <p class="text-gray-500 text-sm">No BYOK keys configured yet. Add one to override the server's environment variable for a specific LLM profile.</p>
  {:else}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-4 py-2">Profile</th>
            <th class="px-4 py-2">Provider</th>
            <th class="px-4 py-2">Label</th>
            <th class="px-4 py-2">Key (masked)</th>
            <th class="px-4 py-2">Created</th>
            <th class="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each keys as k (k.profile_id || k.id)}
            <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td class="px-4 py-2 font-mono text-xs">{k.profile_id}</td>
              <td class="px-4 py-2 font-mono text-xs">{k.provider || '—'}</td>
              <td class="px-4 py-2">{k.label || '—'}</td>
              <td class="px-4 py-2 font-mono text-xs text-gray-500">{maskKey(k.api_key_masked || k.api_key)}</td>
              <td class="px-4 py-2 text-xs text-gray-500">{k.created_at?.slice(0, 10) || '—'}</td>
              <td class="px-4 py-2 text-right">
                <button class="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded" onclick={() => (pendingDelete = k)}>Delete</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<ConfirmDialog
  open={pendingDelete !== null}
  title="Delete BYOK key"
  message={pendingDelete ? `Delete key for profile ${pendingDelete.profile_id}?` : ''}
  confirmLabel={i18n.t('common.delete')}
  cancelLabel={i18n.t('common.cancel')}
  variant="danger"
  onConfirm={confirmDelete}
  onCancel={() => (pendingDelete = null)}
/>

<ConfirmDialog
  open={pendingWipe}
  title="Wipe all BYOK keys"
  message="Delete ALL your stored API keys? This cannot be undone."
  confirmLabel="Wipe all"
  cancelLabel={i18n.t('common.cancel')}
  variant="danger"
  onConfirm={confirmWipe}
  onCancel={() => (pendingWipe = false)}
/>

<style>
  .form-field { display: flex; flex-direction: column; gap: 4px; }
  .field-label { font-size: 0.8rem; font-weight: 500; color: var(--color-text, #cdd6f4); }
  .field-input {
    padding: 8px 12px; border: 1px solid var(--color-border, #313244); border-radius: 6px;
    background: var(--color-surface, #313244); color: var(--color-text, #cdd6f4);
    font-size: 0.875rem; font-family: inherit;
  }
  .field-input:focus { outline: none; border-color: var(--color-primary, #89b4fa); }
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
</style>

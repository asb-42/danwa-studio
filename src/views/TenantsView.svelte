<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import {
    listTenants,
    getCurrentTenant,
    updateCurrentTenantSettings,
    listCurrentTenantUsers,
    inviteToCurrentTenant,
    removeFromCurrentTenant,
  } from '../lib/admin/api.js';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  let t = $derived((key, params) => i18n.t(key, params));

  let tenants = $state([]);
  let currentTenant = $state(null);
  let currentUsers = $state([]);
  let loading = $state(false);

  // Edit-settings form
  let settingsJson = $state('{}');
  let settingsError = $state(null);
  let savingSettings = $state(false);

  // Invite form
  let showInvite = $state(false);
  let inviteEmail = $state('');
  let inviteDisplayName = $state('');
  let invitePassword = $state('');
  let inviteRole = $state('viewer');
  let inviting = $state(false);

  // Delete confirm
  let pendingDelete = $state(null);

  onMount(loadAll);

  async function loadAll() {
    loading = true;
    try {
      [tenants, currentTenant, currentUsers] = await Promise.all([
        listTenants().catch(() => []),
        getCurrentTenant().catch(() => null),
        listCurrentTenantUsers().catch(() => []),
      ]);
      if (currentTenant) {
        settingsJson = JSON.stringify(currentTenant.settings || {}, null, 2);
      }
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loading = false;
    }
  }

  async function handleSaveSettings() {
    settingsError = null;
    let parsed;
    try {
      parsed = JSON.parse(settingsJson);
    } catch (e) {
      settingsError = `Invalid JSON: ${e.message}`;
      return;
    }
    savingSettings = true;
    try {
      await updateCurrentTenantSettings(parsed);
      await loadAll();
    } catch (e) {
      settingsError = e.message;
    } finally {
      savingSettings = false;
    }
  }

  async function handleInvite() {
    if (!inviteEmail || !invitePassword) {
      errorStore.set('email and password are required');
      return;
    }
    inviting = true;
    try {
      await inviteToCurrentTenant({
        email: inviteEmail,
        display_name: inviteDisplayName || null,
        password: invitePassword,
        role: inviteRole,
      });
      showInvite = false;
      inviteEmail = '';
      inviteDisplayName = '';
      invitePassword = '';
      inviteRole = 'viewer';
      await loadAll();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      inviting = false;
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.user_id || pendingDelete.id;
    pendingDelete = null;
    try {
      await removeFromCurrentTenant(id);
      await loadAll();
    } catch (e) {
      errorStore.set(e.message);
    }
  }

  function roleBadge(role) {
    if (role === 'admin') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (role === 'editor') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (role === 'viewer') return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    return 'bg-gray-100 text-gray-700';
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{i18n.t('nav.tenants')}</h1>
    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
      Tenant administration — settings, members, role management.
    </p>
  </div>

  {#if loading}
    <p class="text-gray-500 text-sm">{i18n.t('common.loading')}</p>
  {:else}
    <!-- Current tenant card -->
    {#if currentTenant}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{currentTenant.name}</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
              {currentTenant.tenant_id || currentTenant.id} · plan: {currentTenant.plan || '—'}
            </p>
          </div>
        </div>
        <div class="form-field">
          <label class="field-label" for="settings">Tenant settings (JSON)</label>
          <textarea id="settings" class="field-input font-mono" rows="6" bind:value={settingsJson}></textarea>
          {#if settingsError}<div class="form-error">{settingsError}</div>{/if}
        </div>
        <div class="flex justify-end mt-2">
          <button class="btn-primary" onclick={handleSaveSettings} disabled={savingSettings}>
            {savingSettings ? '…' : 'Save settings'}
          </button>
        </div>
      </div>
    {/if}

    <!-- Members -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Members ({currentUsers.length})</h2>
        <button class="text-xs px-3 py-1.5 bg-blue-600 text-white rounded" onclick={() => (showInvite = !showInvite)}>
          {showInvite ? 'Close' : '+ Invite'}
        </button>
      </div>

      {#if showInvite}
        <div class="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <div class="grid grid-cols-2 gap-2">
            <div class="form-field">
              <label class="field-label" for="inv-email">Email *</label>
              <input id="inv-email" type="email" class="field-input" bind:value={inviteEmail} />
            </div>
            <div class="form-field">
              <label class="field-label" for="inv-name">Display name</label>
              <input id="inv-name" type="text" class="field-input" bind:value={inviteDisplayName} />
            </div>
            <div class="form-field">
              <label class="field-label" for="inv-pw">Password * (min 8 chars)</label>
              <input id="inv-pw" type="password" class="field-input" bind:value={invitePassword} minlength="8" />
            </div>
            <div class="form-field">
              <label class="field-label" for="inv-role">Role</label>
              <select id="inv-role" class="field-input" bind:value={inviteRole}>
                <option value="viewer">viewer</option>
                <option value="editor">editor</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end mt-2">
            <button class="btn-primary" onclick={handleInvite} disabled={inviting}>
              {inviting ? '…' : 'Send invite'}
            </button>
          </div>
        </div>
      {/if}

      {#if currentUsers.length === 0}
        <p class="p-8 text-center text-gray-500 text-sm">{i18n.t('common.noData')}</p>
      {:else}
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-2">Email</th>
              <th class="px-4 py-2">Name</th>
              <th class="px-4 py-2">Role</th>
              <th class="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each currentUsers as u (u.user_id || u.id)}
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-4 py-2 font-mono text-xs">{u.email}</td>
                <td class="px-4 py-2">{u.display_name || '—'}</td>
                <td class="px-4 py-2">
                  <span class="text-xs px-2 py-0.5 rounded-full {roleBadge(u.role)}">{u.role}</span>
                </td>
                <td class="px-4 py-2 text-right">
                  <button class="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded" onclick={() => (pendingDelete = u)}>Remove</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>

    <!-- All tenants (admin) -->
    {#if tenants.length > 0}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div class="p-3 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">All tenants ({tenants.length})</h2>
        </div>
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-2">ID</th>
              <th class="px-4 py-2">Name</th>
              <th class="px-4 py-2">Plan</th>
              <th class="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {#each tenants as tn (tn.tenant_id || tn.id)}
              <tr class="border-b dark:border-gray-700">
                <td class="px-4 py-2 font-mono text-xs">{tn.tenant_id || tn.id}</td>
                <td class="px-4 py-2">{tn.name}</td>
                <td class="px-4 py-2">{tn.plan || '—'}</td>
                <td class="px-4 py-2 text-xs text-gray-500">{tn.created_at?.slice(0, 10) || '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<ConfirmDialog
  open={pendingDelete !== null}
  title="Remove member"
  message={pendingDelete ? `Remove ${pendingDelete.email} from this tenant?` : ''}
  confirmLabel={i18n.t('common.delete')}
  cancelLabel={i18n.t('common.cancel')}
  variant="danger"
  onConfirm={confirmDelete}
  onCancel={() => (pendingDelete = null)}
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
  .form-error {
    padding: 8px 12px; border-radius: 6px;
    background: rgba(243, 139, 168, 0.1); border: 1px solid var(--color-error, #f38ba8);
    color: var(--color-error, #f38ba8); font-size: 0.85rem;
  }
</style>

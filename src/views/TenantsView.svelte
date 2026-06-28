<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore, toast } from '../lib/stores.js';
  import {
    listTenants,
    getCurrentTenant,
    createTenant,
    updateTenant,
    deleteTenant,
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

  // Create form
  let showCreate = $state(false);
  let createName = $state('');
  let createPlan = $state('free');
  let creating = $state(false);

  // Edit form
  let editing = $state(null); // tenant object being edited
  let editName = $state('');
  let editPlan = $state('free');
  let editMaxProjects = $state(5);
  let editMaxConcurrentDebates = $state(2);
  let editMaxDocuments = $state(50);
  let editMaxStorageMb = $state(500);
  let editIsActive = $state(true);
  let saving = $state(false);

  // Current tenant settings
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
  let pendingDelete = $state(null); // { type: 'tenant'|'member', item: {...} }

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

  // ─── Create ───────────────────────────────────────

  function openCreate() {
    createName = '';
    createPlan = 'free';
    showCreate = true;
  }

  async function handleCreate() {
    if (!createName.trim()) {
      errorStore.set('Tenant name is required');
      return;
    }
    creating = true;
    try {
      await createTenant({ name: createName.trim(), plan: createPlan });
      showCreate = false;
      toast.set({ message: 'Tenant created', type: 'success' });
      await loadAll();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      creating = false;
    }
  }

  // ─── Edit ─────────────────────────────────────────

  function openEdit(tenant) {
    editing = tenant;
    editName = tenant.name;
    editPlan = tenant.plan || 'free';
    editMaxProjects = tenant.max_projects ?? 5;
    editMaxConcurrentDebates = tenant.max_concurrent_debates ?? 2;
    editMaxDocuments = tenant.max_documents ?? 50;
    editMaxStorageMb = tenant.max_storage_mb ?? 500;
    editIsActive = tenant.is_active ?? true;
  }

  function closeEdit() {
    editing = null;
  }

  async function handleUpdate() {
    if (!editName.trim()) {
      errorStore.set('Tenant name is required');
      return;
    }
    saving = true;
    try {
      await updateTenant(editing.id, {
        name: editName.trim(),
        plan: editPlan,
        max_projects: editMaxProjects,
        max_concurrent_debates: editMaxConcurrentDebates,
        max_documents: editMaxDocuments,
        max_storage_mb: editMaxStorageMb,
        is_active: editIsActive,
      });
      editing = null;
      toast.set({ message: 'Tenant updated', type: 'success' });
      await loadAll();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      saving = false;
    }
  }

  // ─── Delete ───────────────────────────────────────

  function confirmDeleteTenant(tenant) {
    pendingDelete = { type: 'tenant', item: tenant };
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    const { type, item } = pendingDelete;
    pendingDelete = null;
    try {
      if (type === 'tenant') {
        await deleteTenant(item.id);
        toast.set({ message: 'Tenant deleted', type: 'success' });
      } else {
        await removeFromCurrentTenant(item.user_id || item.id);
      }
      await loadAll();
    } catch (e) {
      errorStore.set(e.message);
    }
  }

  // ─── Settings ─────────────────────────────────────

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
      toast.set({ message: 'Settings saved', type: 'success' });
      await loadAll();
    } catch (e) {
      settingsError = e.message;
    } finally {
      savingSettings = false;
    }
  }

  // ─── Invite ───────────────────────────────────────

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
      toast.set({ message: 'User invited', type: 'success' });
      await loadAll();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      inviting = false;
    }
  }

  // ─── Helpers ──────────────────────────────────────

  function planBadge(plan) {
    if (plan === 'enterprise') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    if (plan === 'pro') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }

  function roleBadge(role) {
    if (role === 'admin') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (role === 'editor') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{i18n.t('nav.tenants')}</h1>
    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
      Tenant administration — create, edit, delete tenants. Manage members and settings.
    </p>
  </div>

  {#if loading}
    <p class="text-gray-500 dark:text-gray-400 text-sm">{i18n.t('common.loading')}</p>
  {:else}
    <!-- All tenants list with CRUD -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Tenants ({tenants.length})</h2>
        <button class="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700" onclick={openCreate}>
          + New Tenant
        </button>
      </div>

      {#if showCreate}
        <div class="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <h3 class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Create Tenant</h3>
          <div class="grid grid-cols-2 gap-2">
            <div class="form-field">
              <label class="field-label" for="cr-name">Name *</label>
              <input id="cr-name" type="text" class="field-input" bind:value={createName} placeholder="e.g. Acme Corp" />
            </div>
            <div class="form-field">
              <label class="field-label" for="cr-plan">Plan</label>
              <select id="cr-plan" class="field-input" bind:value={createPlan}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-2">
            <button class="text-xs px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded" onclick={() => (showCreate = false)}>Cancel</button>
            <button class="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700" onclick={handleCreate} disabled={creating}>
              {creating ? '…' : 'Create'}
            </button>
          </div>
        </div>
      {/if}

      {#if tenants.length === 0}
        <p class="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">{i18n.t('common.noData')}</p>
      {:else}
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-2">Name</th>
              <th class="px-4 py-2">Plan</th>
              <th class="px-4 py-2">Limits</th>
              <th class="px-4 py-2">Status</th>
              <th class="px-4 py-2">Created</th>
              <th class="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each tenants as tn (tn.tenant_id || tn.id)}
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-4 py-2 font-medium text-gray-900 dark:text-white">{tn.name}</td>
                <td class="px-4 py-2">
                  <span class="text-xs px-2 py-0.5 rounded-full {planBadge(tn.plan)}">{tn.plan || 'free'}</span>
                </td>
                <td class="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                  {tn.max_projects ?? 5} projects · {tn.max_concurrent_debates ?? 2} debates · {tn.max_documents ?? 50} docs · {tn.max_storage_mb ?? 500} MB
                </td>
                <td class="px-4 py-2">
                  {#if tn.is_active}
                    <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Active</span>
                  {:else}
                    <span class="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Disabled</span>
                  {/if}
                </td>
                <td class="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{tn.created_at?.slice(0, 10) || '—'}</td>
                <td class="px-4 py-2 text-right">
                  <button class="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded mr-1" onclick={() => openEdit(tn)}>Edit</button>
                  <button class="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded" onclick={() => confirmDeleteTenant(tn)}>Delete</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>

    <!-- Current tenant card -->
    {#if currentTenant}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Your Tenant: {currentTenant.name}</h2>
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
        <button class="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700" onclick={() => (showInvite = !showInvite)}>
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
        <p class="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">{i18n.t('common.noData')}</p>
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
                  <button class="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded" onclick={() => (pendingDelete = { type: 'member', item: u })}>Remove</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}
</div>

<!-- Edit Tenant Modal -->
{#if editing}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={closeEdit} role="presentation">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg p-5" onclick={(e) => e.stopPropagation()} role="document">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Tenant: {editing.name}</h2>

      <div class="grid grid-cols-2 gap-3">
        <div class="form-field col-span-2">
          <label class="field-label" for="ed-name">Name</label>
          <input id="ed-name" type="text" class="field-input" bind:value={editName} />
        </div>

        <div class="form-field">
          <label class="field-label" for="ed-plan">Plan</label>
          <select id="ed-plan" class="field-input" bind:value={editPlan}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div class="form-field">
          <label class="field-label" for="ed-active">Status</label>
          <select id="ed-active" class="field-input" bind:value={editIsActive}>
            <option value={true}>Active</option>
            <option value={false}>Disabled</option>
          </select>
        </div>

        <div class="form-field">
          <label class="field-label" for="ed-projects">Max Projects</label>
          <input id="ed-projects" type="number" class="field-input" bind:value={editMaxProjects} min="1" />
        </div>

        <div class="form-field">
          <label class="field-label" for="ed-debates">Max Concurrent Debates</label>
          <input id="ed-debates" type="number" class="field-input" bind:value={editMaxConcurrentDebates} min="1" />
        </div>

        <div class="form-field">
          <label class="field-label" for="ed-docs">Max Documents</label>
          <input id="ed-docs" type="number" class="field-input" bind:value={editMaxDocuments} min="1" />
        </div>

        <div class="form-field">
          <label class="field-label" for="ed-storage">Max Storage (MB)</label>
          <input id="ed-storage" type="number" class="field-input" bind:value={editMaxStorageMb} min="1" />
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <button class="text-xs px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded" onclick={closeEdit}>Cancel</button>
        <button class="btn-primary" onclick={handleUpdate} disabled={saving}>
          {saving ? '…' : 'Save'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirm -->
<ConfirmDialog
  open={pendingDelete !== null}
  title={pendingDelete?.type === 'tenant' ? 'Delete tenant' : 'Remove member'}
  message={pendingDelete ? (pendingDelete.type === 'tenant'
    ? `Permanently delete "${pendingDelete.item.name}" and all its data? This cannot be undone.`
    : `Remove ${pendingDelete.item.email} from this tenant?`) : ''}
  confirmLabel={i18n.t('common.delete')}
  cancelLabel={i18n.t('common.cancel')}
  variant="danger"
  onConfirm={handleConfirmDelete}
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

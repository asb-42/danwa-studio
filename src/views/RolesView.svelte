<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import {
    listRoleDefinitions,
    createRoleDefinition,
    updateRoleDefinition,
    deleteRoleDefinition,
  } from '../lib/blueprint/api.js';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  let t = $derived((key, params) => i18n.t(key, params));

  let roles = $state([]);
  let loading = $state(false);
  let showModal = $state(false);
  let editingRole = $state(null);
  let pendingDeleteId = $state(null);

  // Edit form state
  let form = $state({});
  let saving = $state(false);
  let error = $state(null);

  let isNew = $derived(!editingRole);

  function slugify(s) {
    return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
  }

  async function loadRoles() {
    loading = true;
    try {
      roles = await listRoleDefinitions({ limit: 100 });
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loading = false;
    }
  }

  onMount(loadRoles);

  $effect(() => {
    if (showModal) {
      error = null;
      if (editingRole) {
        form = {
          id: editingRole.id || '',
          name: editingRole.name || '',
          role_type_id: editingRole.role_type_id || 'strategist',
          description: editingRole.description || '',
          argumentation_pattern: editingRole.argumentation_pattern || '',
          mode: editingRole.mode || '',
          prompt_template_id: editingRole.prompt_template_id || '',
          max_rounds: editingRole.max_rounds ?? 5,
          consensus_threshold: editingRole.consensus_threshold ?? 0.9,
          tags: Array.isArray(editingRole.tags) ? editingRole.tags.join(', ') : '',
        };
      } else {
        form = {
          id: '',
          name: '',
          role_type_id: 'strategist',
          description: '',
          argumentation_pattern: '',
          mode: '',
          prompt_template_id: '',
          max_rounds: 5,
          consensus_threshold: 0.9,
          tags: '',
        };
      }
    }
  });

  $effect(() => {
    if (isNew && form.name) form.id = slugify(form.name);
  });

  function handleCreate() {
    editingRole = null;
    showModal = true;
  }

  function handleEdit(role) {
    editingRole = role;
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
      await deleteRoleDefinition(id);
      await loadRoles();
    } catch (e) {
      errorStore.set(e.message);
    }
  }

  async function handleSave() {
    if (!form.id || !form.name) { error = 'id and name are required'; return; }
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(form.id)) { error = 'id must match [a-z0-9][a-z0-9._-]*'; return; }
    if (form.max_rounds < 1) { error = 'max_rounds must be >= 1'; return; }
    if (form.consensus_threshold < 0 || form.consensus_threshold > 1) { error = 'consensus_threshold must be 0..1'; return; }
    saving = true;
    error = null;
    try {
      const payload = {
        id: form.id,
        name: form.name,
        role_type_id: form.role_type_id,
        description: form.description,
        argumentation_pattern: form.argumentation_pattern || null,
        mode: form.mode || null,
        prompt_template_id: form.prompt_template_id || null,
        max_rounds: form.max_rounds,
        consensus_threshold: form.consensus_threshold,
        tags: form.tags ? form.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
      };
      if (isNew) {
        await createRoleDefinition(payload);
      } else {
        await updateRoleDefinition(editingRole.id, payload);
      }
      showModal = false;
      editingRole = null;
      await loadRoles();
    } catch (e) {
      error = e.message;
    } finally {
      saving = false;
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{i18n.t('nav.roles')}</h1>
    <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onclick={handleCreate}>
      {i18n.t('common.create')}
    </button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-32">
      <p class="text-gray-500 dark:text-gray-400">{i18n.t('common.loading')}</p>
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      {#if roles.length === 0}
        <div class="p-8 text-center">
          <p class="text-gray-500 dark:text-gray-400 mb-4">{i18n.t('common.noData')}</p>
          <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onclick={handleCreate}>
            {i18n.t('common.create')}
          </button>
        </div>
      {:else}
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-3">{i18n.t('config.name')}</th>
              <th class="px-4 py-3">Role Type</th>
              <th class="px-4 py-3">Argumentation</th>
              <th class="px-4 py-3">Mode</th>
              <th class="px-4 py-3">Max Rounds</th>
              <th class="px-4 py-3">Threshold</th>
              <th class="px-4 py-3 text-right">{i18n.t('config.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {#each roles as role (role.id)}
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {role.name}
                  <span class="block text-xs text-gray-400 dark:text-gray-500 font-mono">{role.id}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {role.role_type_id}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{role.argumentation_pattern || '—'}</td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{role.mode || '—'}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{role.max_rounds ?? '—'}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                  {role.consensus_threshold != null ? role.consensus_threshold.toFixed(2) : '—'}
                </td>
                <td class="px-4 py-3 text-right space-x-1">
                  <button class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors" onclick={() => handleEdit(role)}>
                    {i18n.t('common.edit')}
                  </button>
                  <button class="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors" onclick={() => handleDelete(role.id)}>
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
  title="Delete Role Definition"
  message="Are you sure you want to delete this role definition?"
  confirmLabel={i18n.t('common.delete')}
  cancelLabel={i18n.t('common.cancel')}
  variant="danger"
  onConfirm={confirmDelete}
  onCancel={() => (pendingDeleteId = null)}
/>

{#if showModal}
  <div class="modal-overlay" role="dialog" tabindex="-1" aria-modal="true" onkeydown={(e) => { if (e.key === 'Escape') { showModal = false; editingRole = null; } }}>
    <div class="modal-container">
      <div class="modal-header">
        <h2 class="modal-title">{isNew ? 'Create Role Definition' : 'Edit Role Definition'}</h2>
        <button class="close-btn" onclick={() => { showModal = false; editingRole = null; }}>✕</button>
      </div>

      <div class="modal-body">
        {#if error}<div class="form-error">{error}</div>{/if}

        <div class="form-row">
          <div class="form-field flex-1">
            <label class="field-label" for="rd-name">{i18n.t('config.name')}</label>
            <input id="rd-name" type="text" class="field-input" bind:value={form.name} placeholder="Strategist-Default" />
          </div>
          <div class="form-field flex-1">
            <label class="field-label" for="rd-id">id</label>
            <input id="rd-id" type="text" class="field-input" bind:value={form.id} disabled={!isNew} />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field flex-1">
            <label class="field-label" for="rd-role-type">Role Type</label>
            <input id="rd-role-type" type="text" class="field-input" bind:value={form.role_type_id} list="role-type-list" />
            <datalist id="role-type-list">
              <option value="strategist"></option>
              <option value="critic"></option>
              <option value="optimizer"></option>
              <option value="moderator"></option>
            </datalist>
          </div>
          <div class="form-field flex-1">
            <label class="field-label" for="rd-mode">Mode</label>
            <input id="rd-mode" type="text" class="field-input" bind:value={form.mode} placeholder="e.g. dialectic" />
          </div>
        </div>

        <div class="form-field">
          <label class="field-label" for="rd-argpat">Argumentation Pattern</label>
          <input id="rd-argpat" type="text" class="field-input" bind:value={form.argumentation_pattern} placeholder="e.g. kantian, steiner" />
        </div>

        <div class="form-field">
          <label class="field-label" for="rd-prompt-tpl">Prompt Template ID (optional)</label>
          <input id="rd-prompt-tpl" type="text" class="field-input" bind:value={form.prompt_template_id} />
        </div>

        <div class="form-row">
          <div class="form-field flex-1">
            <label class="field-label" for="rd-max-rounds">Max Rounds</label>
            <input id="rd-max-rounds" type="number" min="1" class="field-input" bind:value={form.max_rounds} />
          </div>
          <div class="form-field flex-1">
            <label class="field-label" for="rd-threshold">Consensus Threshold (0..1)</label>
            <input id="rd-threshold" type="number" min="0" max="1" step="0.05" class="field-input" bind:value={form.consensus_threshold} />
          </div>
        </div>

        <div class="form-field">
          <label class="field-label" for="rd-desc">{i18n.t('config.description')}</label>
          <textarea id="rd-desc" class="field-input" rows="2" bind:value={form.description}></textarea>
        </div>

        <div class="form-field">
          <label class="field-label" for="rd-tags">Tags (comma-separated)</label>
          <input id="rd-tags" type="text" class="field-input" bind:value={form.tags} />
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={() => { showModal = false; editingRole = null; }} disabled={saving}>{i18n.t('common.cancel')}</button>
        <button class="btn-primary" onclick={handleSave} disabled={saving}>
          {saving ? '…' : i18n.t('common.save')}
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
    max-width: 640px;
    width: 92%;
    max-height: 90vh;
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
  .modal-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text, #cdd6f4);
    margin: 0;
  }
  .close-btn {
    background: none;
    border: none;
    color: var(--color-text-muted, #6c7086);
    font-size: 1.25rem;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
  }
  .close-btn:hover { background: var(--color-surface, #313244); }
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .form-field { display: flex; flex-direction: column; gap: 4px; }
  .field-label { font-size: 0.8rem; font-weight: 500; color: var(--color-text, #cdd6f4); }
  .field-input, textarea.field-input {
    padding: 8px 12px;
    border: 1px solid var(--color-border, #313244);
    border-radius: 6px;
    background: var(--color-surface, #313244);
    color: var(--color-text, #cdd6f4);
    font-size: 0.875rem;
    font-family: inherit;
  }
  .field-input:focus, textarea.field-input:focus { outline: none; border-color: var(--color-primary, #89b4fa); }
  .field-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .form-row { display: flex; gap: 12px; }
  .flex-1 { flex: 1; }
  .form-error {
    padding: 8px 12px;
    border-radius: 6px;
    background: rgba(243, 139, 168, 0.1);
    border: 1px solid var(--color-error, #f38ba8);
    color: var(--color-error, #f38ba8);
    font-size: 0.85rem;
  }
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

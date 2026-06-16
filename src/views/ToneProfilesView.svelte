<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import {
    listToneProfiles,
    createToneProfile,
    updateToneProfile,
    deleteToneProfile,
  } from '../lib/blueprint/api.js';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  let t = $derived((key, params) => $i18n.t(key, params));

  let profiles = $state([]);
  let loading = $state(false);
  let showModal = $state(false);
  let editingProfile = $state(null);
  let pendingDeleteId = $state(null);

  // Edit form state
  let form = $state({});
  let saving = $state(false);
  let error = $state(null);

  let isNew = $derived(!editingProfile);

  let styles = ['heated', 'academic', 'conversational', 'socratic', 'neutral'];
  let verbosities = ['concise', 'normal', 'verbose'];
  let rhetoricalModes = ['none', 'questioning', 'assertive', 'dialectic'];

  function slugify(s) {
    return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
  }

  async function loadProfiles() {
    loading = true;
    try {
      profiles = await listToneProfiles({ limit: 100 });
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loading = false;
    }
  }

  onMount(loadProfiles);

  $effect(() => {
    if (showModal) {
      error = null;
      if (editingProfile) {
        form = {
          id: editingProfile.id || '',
          name: editingProfile.name || '',
          description: editingProfile.description || '',
          style: editingProfile.style || 'neutral',
          formality: editingProfile.formality ?? 0.5,
          verbosity: editingProfile.verbosity || 'normal',
          emotional_valence: editingProfile.emotional_valence ?? 0.5,
          rhetorical_mode: editingProfile.rhetorical_mode || 'none',
          custom_instructions: editingProfile.custom_instructions || '',
          is_system: editingProfile.is_system ?? false,
        };
      } else {
        form = {
          id: '',
          name: '',
          description: '',
          style: 'neutral',
          formality: 0.5,
          verbosity: 'normal',
          emotional_valence: 0.5,
          rhetorical_mode: 'none',
          custom_instructions: '',
          is_system: false,
        };
      }
    }
  });

  $effect(() => {
    if (isNew && form.name) form.id = slugify(form.name);
  });

  function handleCreate() {
    editingProfile = null;
    showModal = true;
  }

  function handleEdit(p) {
    editingProfile = p;
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
      await deleteToneProfile(id);
      await loadProfiles();
    } catch (e) {
      errorStore.set(e.message);
    }
  }

  async function handleSave() {
    if (!form.id || !form.name) { error = 'id and name are required'; return; }
    if (form.formality < 0 || form.formality > 1) { error = 'formality must be 0..1'; return; }
    if (form.emotional_valence < 0 || form.emotional_valence > 1) { error = 'emotional_valence must be 0..1'; return; }
    saving = true;
    error = null;
    try {
      const payload = {
        name: form.name,
        description: form.description,
        style: form.style,
        formality: form.formality,
        verbosity: form.verbosity,
        emotional_valence: form.emotional_valence,
        rhetorical_mode: form.rhetorical_mode,
        custom_instructions: form.custom_instructions || null,
        is_system: form.is_system,
      };
      if (isNew) {
        await createToneProfile(payload);
      } else {
        await updateToneProfile(editingProfile.id, payload);
      }
      showModal = false;
      editingProfile = null;
      await loadProfiles();
    } catch (e) {
      error = e.message;
    } finally {
      saving = false;
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{$i18n.t('nav.tones')}</h1>
    <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onclick={handleCreate}>
      {$i18n.t('common.create')}
    </button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-32">
      <p class="text-gray-500">{$i18n.t('common.loading')}</p>
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      {#if profiles.length === 0}
        <div class="p-8 text-center">
          <p class="text-gray-500 dark:text-gray-400 mb-4">{$i18n.t('common.noData')}</p>
          <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onclick={handleCreate}>
            {$i18n.t('common.create')}
          </button>
        </div>
      {:else}
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-3">{$i18n.t('config.name')}</th>
              <th class="px-4 py-3">Style</th>
              <th class="px-4 py-3">Formality</th>
              <th class="px-4 py-3">Verbosity</th>
              <th class="px-4 py-3">Emotion</th>
              <th class="px-4 py-3">Rhetoric</th>
              <th class="px-4 py-3 text-right">{$i18n.t('config.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {#each profiles as p (p.id)}
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {p.name}
                  {#if p.is_system}<span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ml-1">sys</span>{/if}
                  <span class="block text-xs text-gray-400 font-mono">{p.id}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {p.style}
                  </span>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                  <div class="flex items-center gap-2">
                    <div class="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded">
                      <div class="h-full bg-blue-500 rounded" style="width: {(p.formality ?? 0) * 100}%"></div>
                    </div>
                    <span>{p.formality?.toFixed(2) ?? '—'}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{p.verbosity}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                  <div class="flex items-center gap-2">
                    <div class="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded">
                      <div class="h-full bg-pink-500 rounded" style="width: {(p.emotional_valence ?? 0) * 100}%"></div>
                    </div>
                    <span>{p.emotional_valence?.toFixed(2) ?? '—'}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{p.rhetorical_mode}</td>
                <td class="px-4 py-3 text-right space-x-1">
                  <button class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors" onclick={() => handleEdit(p)}>
                    {$i18n.t('common.edit')}
                  </button>
                  {#if !p.is_system}
                    <button class="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors" onclick={() => handleDelete(p.id)}>
                      {$i18n.t('common.delete')}
                    </button>
                  {/if}
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
  title="Delete Tone Profile"
  message="Are you sure you want to delete this tone profile?"
  confirmLabel={$i18n.t('common.delete')}
  cancelLabel={$i18n.t('common.cancel')}
  variant="danger"
  onConfirm={confirmDelete}
  onCancel={() => (pendingDeleteId = null)}
/>

{#if showModal}
  <div class="modal-overlay" role="dialog" aria-modal="true" onkeydown={(e) => { if (e.key === 'Escape') { showModal = false; editingProfile = null; } }}>
    <div class="modal-container" role="document" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2 class="modal-title">{isNew ? 'Create Tone Profile' : 'Edit Tone Profile'}</h2>
        <button class="close-btn" onclick={() => { showModal = false; editingProfile = null; }}>✕</button>
      </div>

      <div class="modal-body">
        {#if error}<div class="form-error">{error}</div>{/if}

        <div class="form-row">
          <div class="form-field flex-1">
            <label class="field-label" for="tp-name">{$i18n.t('config.name')}</label>
            <input id="tp-name" type="text" class="field-input" bind:value={form.name} placeholder="Academic-Strict" />
          </div>
          <div class="form-field flex-1">
            <label class="field-label" for="tp-id">id</label>
            <input id="tp-id" type="text" class="field-input" bind:value={form.id} disabled={!isNew} />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field flex-1">
            <label class="field-label" for="tp-style">Style</label>
            <select id="tp-style" class="field-select" bind:value={form.style}>
              {#each styles as s (s)}<option value={s}>{s}</option>{/each}
            </select>
          </div>
          <div class="form-field flex-1">
            <label class="field-label" for="tp-verbosity">Verbosity</label>
            <select id="tp-verbosity" class="field-select" bind:value={form.verbosity}>
              {#each verbosities as v (v)}<option value={v}>{v}</option>{/each}
            </select>
          </div>
          <div class="form-field flex-1">
            <label class="field-label" for="tp-rhetoric">Rhetorical Mode</label>
            <select id="tp-rhetoric" class="field-select" bind:value={form.rhetorical_mode}>
              {#each rhetoricalModes as r (r)}<option value={r}>{r}</option>{/each}
            </select>
          </div>
        </div>

        <div class="form-field">
          <label class="field-label" for="tp-formality">
            Formality: <span class="font-mono">{form.formality.toFixed(2)}</span>
          </label>
          <input id="tp-formality" type="range" min="0" max="1" step="0.05" class="field-range" bind:value={form.formality} />
          <div class="text-xs text-gray-500 dark:text-gray-400">0 = casual, 1 = very formal</div>
        </div>

        <div class="form-field">
          <label class="field-label" for="tp-emotion">
            Emotional Valence: <span class="font-mono">{form.emotional_valence.toFixed(2)}</span>
          </label>
          <input id="tp-emotion" type="range" min="0" max="1" step="0.05" class="field-range" bind:value={form.emotional_valence} />
          <div class="text-xs text-gray-500 dark:text-gray-400">0 = cool/neutral, 1 = heated/passionate</div>
        </div>

        <div class="form-field">
          <label class="field-label" for="tp-custom">Custom Instructions (optional)</label>
          <textarea id="tp-custom" class="field-input" rows="3" bind:value={form.custom_instructions} placeholder="Additional instructions for the agent on how to speak…"></textarea>
        </div>

        <div class="form-field">
          <label class="field-label" for="tp-desc">{$i18n.t('config.description')}</label>
          <textarea id="tp-desc" class="field-input" rows="2" bind:value={form.description}></textarea>
        </div>

        <div class="form-field form-check">
          <label class="check-label">
            <input type="checkbox" bind:checked={form.is_system} />
            <span>System profile (protected, cannot be deleted)</span>
          </label>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={() => { showModal = false; editingProfile = null; }} disabled={saving}>{$i18n.t('common.cancel')}</button>
        <button class="btn-primary" onclick={handleSave} disabled={saving}>
          {saving ? '…' : $i18n.t('common.save')}
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
  .modal-title { font-size: 1.1rem; font-weight: 600; color: var(--color-text, #cdd6f4); margin: 0; }
  .close-btn { background: none; border: none; color: var(--color-text-muted, #6c7086); font-size: 1.25rem; cursor: pointer; padding: 4px 8px; border-radius: 4px; }
  .close-btn:hover { background: var(--color-surface, #313244); }
  .modal-body { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
  .form-field { display: flex; flex-direction: column; gap: 4px; }
  .field-label { font-size: 0.8rem; font-weight: 500; color: var(--color-text, #cdd6f4); }
  .field-input, .field-select, textarea.field-input {
    padding: 8px 12px;
    border: 1px solid var(--color-border, #313244);
    border-radius: 6px;
    background: var(--color-surface, #313244);
    color: var(--color-text, #cdd6f4);
    font-size: 0.875rem;
    font-family: inherit;
  }
  .field-input:focus, .field-select:focus, textarea.field-input:focus { outline: none; border-color: var(--color-primary, #89b4fa); }
  .field-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .field-range {
    width: 100%;
    accent-color: var(--color-primary, #89b4fa);
  }
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
  .form-check { flex-direction: row; align-items: center; }
  .check-label { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; color: var(--color-text, #cdd6f4); cursor: pointer; }
  .check-label input[type='checkbox'] { width: 16px; height: 16px; cursor: pointer; }
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
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
</style>

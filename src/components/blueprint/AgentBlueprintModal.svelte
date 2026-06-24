<script>
  import { i18n } from '../../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import {
    createAgentBlueprint,
    updateAgentBlueprint,
    listBlueprintLLMProfiles,
    listRoleDefinitions,
    listToneProfiles,
  } from '../../lib/blueprint/api.js';

  let { blueprint = null, visible = false, onSuccess = () => {}, onClose = () => {} } = $props();

  let t = $derived((key, params) => i18n.t(key, params));

  let isNew = $derived(!blueprint);
  let saving = $state(false);
  let error = $state(null);

  // Select-option data loaded on mount
  let llmProfiles = $state([]);
  let roleDefs = $state([]);
  let toneProfiles = $state([]);

  let form = $state({});

  function slugify(s) {
    return (s || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);
  }

  onMount(async () => {
    try {
      [llmProfiles, roleDefs, toneProfiles] = await Promise.all([
        listBlueprintLLMProfiles({ limit: 100 }),
        listRoleDefinitions({ limit: 100 }),
        listToneProfiles({ limit: 100 }),
      ]);
    } catch (e) {
      // Options stay empty; form still works with manual ID entry
      console.warn('Could not load option lists:', e.message);
    }
  });

  $effect(() => {
    if (visible) {
      error = null;
      if (blueprint) {
        form = {
          id: blueprint.id || '',
          name: blueprint.name || '',
          description: blueprint.description || '',
          llm_profile_id: blueprint.llm_profile_id || '',
          role_definition_id: blueprint.role_definition_id || '',
          tone_profile_id: blueprint.tone_profile_id || '',
          tts_voice_id: blueprint.tts_voice_id || '',
          tags: Array.isArray(blueprint.tags) ? blueprint.tags.join(', ') : '',
          is_active: blueprint.is_active ?? true,
        };
      } else {
        form = {
          id: '',
          name: '',
          description: '',
          llm_profile_id: '',
          role_definition_id: '',
          tone_profile_id: '',
          tts_voice_id: '',
          tags: '',
          is_active: true,
        };
      }
    }
  });

  // Auto-slug the id from name (only for new blueprints, only if id is empty)
  $effect(() => {
    if (isNew && form.name) {
      form.id = slugify(form.name);
    }
  });

  async function handleSave() {
    if (!form.id || !form.name) {
      error = 'id and name are required';
      return;
    }
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(form.id)) {
      error = 'id must match [a-z0-9][a-z0-9._-]*';
      return;
    }
    saving = true;
    error = null;
    try {
      const payload = {
        id: form.id,
        name: form.name,
        description: form.description,
        llm_profile_id: form.llm_profile_id,
        role_definition_id: form.role_definition_id,
        tone_profile_id: form.tone_profile_id || null,
        tts_voice_id: form.tts_voice_id || null,
        tags: form.tags
          ? form.tags.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        is_active: form.is_active,
      };
      if (isNew) {
        await createAgentBlueprint(payload);
      } else {
        await updateAgentBlueprint(blueprint.id, payload);
      }
      onSuccess();
    } catch (e) {
      error = e.message;
    } finally {
      saving = false;
    }
  }
</script>

{#if visible}
  <div class="modal-overlay" role="dialog" tabindex="-1" aria-modal="true" onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}>
    <div class="modal-container">
      <div class="modal-header">
        <h2 class="modal-title">{isNew ? i18n.t('agents.create') : i18n.t('agents.edit')}</h2>
        <button class="close-btn" onclick={onClose} aria-label="Close">✕</button>
      </div>

      <div class="modal-body">
        {#if error}
          <div class="form-error">{error}</div>
        {/if}

        <div class="form-row">
          <div class="form-field flex-1">
            <label class="field-label" for="ab-name">{i18n.t('config.name')}</label>
            <input id="ab-name" type="text" class="field-input" bind:value={form.name} placeholder="strategist-main" />
          </div>
          <div class="form-field flex-1">
            <label class="field-label" for="ab-id">id</label>
            <input id="ab-id" type="text" class="field-input" bind:value={form.id} disabled={!isNew} placeholder="strategist-main" />
          </div>
        </div>

        <div class="form-field">
          <label class="field-label" for="ab-description">{i18n.t('config.description')}</label>
          <textarea id="ab-description" class="field-input" rows="2" bind:value={form.description}></textarea>
        </div>

        <div class="form-field">
          <label class="field-label" for="ab-llm">LLM Profile *</label>
          <select id="ab-llm" class="field-select" bind:value={form.llm_profile_id}>
            <option value="">— select —</option>
            {#each llmProfiles as p (p.id)}
              <option value={p.id}>{p.name} ({p.provider}/{p.model})</option>
            {/each}
          </select>
        </div>

        <div class="form-field">
          <label class="field-label" for="ab-role">Role Definition *</label>
          <select id="ab-role" class="field-select" bind:value={form.role_definition_id}>
            <option value="">— select —</option>
            {#each roleDefs as r (r.id)}
              <option value={r.id}>{r.name} ({r.role_type_id})</option>
            {/each}
          </select>
        </div>

        <div class="form-field">
          <label class="field-label" for="ab-tone">Tone Profile (optional)</label>
          <select id="ab-tone" class="field-select" bind:value={form.tone_profile_id}>
            <option value="">— none —</option>
            {#each toneProfiles as tp (tp.id)}
              <option value={tp.id}>{tp.name}</option>
            {/each}
          </select>
        </div>

        <div class="form-field">
          <label class="field-label" for="ab-tts">TTS Voice ID (optional)</label>
          <input id="ab-tts" type="text" class="field-input" bind:value={form.tts_voice_id} placeholder="edge-tts:de-DE-KatjaNeural" />
        </div>

        <div class="form-field">
          <label class="field-label" for="ab-tags">Tags (comma-separated)</label>
          <input id="ab-tags" type="text" class="field-input" bind:value={form.tags} placeholder="default, strategist" />
        </div>

        <div class="form-field form-check">
          <label class="check-label">
            <input type="checkbox" bind:checked={form.is_active} />
            <span>Active</span>
          </label>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={onClose} disabled={saving}>{i18n.t('common.cancel')}</button>
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
  .close-btn:hover {
    background: var(--color-surface, #313244);
  }
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .field-label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-text, #cdd6f4);
  }
  .field-input, .field-select, textarea.field-input {
    padding: 8px 12px;
    border: 1px solid var(--color-border, #313244);
    border-radius: 6px;
    background: var(--color-surface, #313244);
    color: var(--color-text, #cdd6f4);
    font-size: 0.875rem;
    font-family: inherit;
  }
  .field-input:focus, .field-select:focus, textarea.field-input:focus {
    outline: none;
    border-color: var(--color-primary, #89b4fa);
  }
  .field-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .field-input::placeholder {
    color: var(--color-text-muted, #6c7086);
  }
  .form-row {
    display: flex;
    gap: 12px;
  }
  .flex-1 {
    flex: 1;
  }
  .form-error {
    padding: 8px 12px;
    border-radius: 6px;
    background: rgba(243, 139, 168, 0.1);
    border: 1px solid var(--color-error, #f38ba8);
    color: var(--color-error, #f38ba8);
    font-size: 0.85rem;
  }
  .form-check {
    flex-direction: row;
    align-items: center;
  }
  .check-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    color: var(--color-text, #cdd6f4);
    cursor: pointer;
  }
  .check-label input[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;
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
  .btn-secondary:hover {
    background: var(--color-surface, #313244);
  }
  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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
  .btn-primary:hover {
    opacity: 0.9;
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>

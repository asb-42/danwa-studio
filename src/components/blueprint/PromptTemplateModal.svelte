<script>
  import { i18n } from '../../lib/i18n/loader.js';
  import {
    createPromptTemplate,
    updatePromptTemplate,
  } from '../../lib/blueprint/api.js';

  let { template = null, visible = false, readOnly = false, onSuccess = () => {}, onClose = () => {} } = $props();

  let t = $derived((key, params) => i18n.t(key, params));

  let isNew = $derived(!template);
  let saving = $state(false);
  let error = $state(null);

  // readOnly mode: backend returns `_readonly: true` because prompts
  // live as versioned files in danwa-modules — no DB writes allowed.
  let formReadOnly = $derived(!!readOnly);

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

  $effect(() => {
    if (visible) {
      error = null;
      if (template) {
        form = {
          id: template.id || '',
          name: template.name || '',
          role: template.role || 'strategist',
          content: template.content || '',
          language: template.language || 'en',
          variant: template.variant || 'default',
          description: template.description || '',
          tags: Array.isArray(template.tags) ? template.tags.join(', ') : '',
          source_path: template.source_path || '',
        };
      } else {
        form = {
          id: '',
          name: '',
          role: 'strategist',
          content: '',
          language: 'en',
          variant: 'default',
          description: '',
          tags: '',
          source_path: '',
        };
      }
    }
  });

  // Auto-slug the id from name (only for new templates, only if id is empty)
  $effect(() => {
    if (isNew && form.name) {
      form.id = slugify(form.name);
    }
  });

  async function handleSave() {
    if (formReadOnly) return; // defence in depth
    if (!form.id || !form.name) {
      error = 'id and name are required';
      return;
    }
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(form.id)) {
      error = 'id must match [a-z0-9][a-z0-9._-]*';
      return;
    }
    if (!form.content || !form.content.trim()) {
      error = 'content must not be empty';
      return;
    }
    saving = true;
    error = null;
    try {
      const payload = {
        id: form.id,
        name: form.name,
        role: form.role,
        content: form.content,
        language: form.language,
        variant: form.variant,
        description: form.description,
        tags: form.tags
          ? form.tags.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        source_path: form.source_path || null,
      };
      if (isNew) {
        await createPromptTemplate(payload);
      } else {
        await updatePromptTemplate(template.id, payload);
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
    <div class="modal-container" role="document">
      <div class="modal-header">
        <h2 class="modal-title">
          {#if formReadOnly}View{:else}{isNew ? i18n.t('prompts.create') : i18n.t('prompts.edit')}{/if}
          {#if formReadOnly}<span class="readonly-badge">🔒 read-only</span>{/if}
        </h2>
        <button class="close-btn" onclick={onClose} aria-label="Close">✕</button>
      </div>

      <div class="modal-body">
        {#if error}
          <div class="form-error">{error}</div>
        {/if}
        <fieldset class="form-fieldset" disabled={formReadOnly}>

        <div class="form-row">
          <div class="form-field flex-1">
            <label class="field-label" for="pt-name">{i18n.t('config.name')}</label>
            <input id="pt-name" type="text" class="field-input" bind:value={form.name} placeholder="strategist-system-de" />
          </div>
          <div class="form-field flex-1">
            <label class="field-label" for="pt-id">id</label>
            <input id="pt-id" type="text" class="field-input" bind:value={form.id} disabled={!isNew} placeholder="strategist-system-de" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field flex-1">
            <label class="field-label" for="pt-role">{i18n.t('config.role')}</label>
            <input id="pt-role" type="text" class="field-input" bind:value={form.role} placeholder="strategist" list="role-type-suggestions" />
            <datalist id="role-type-suggestions">
              <option value="strategist"></option>
              <option value="critic"></option>
              <option value="optimizer"></option>
              <option value="moderator"></option>
              <option value="angels_advocate"></option>
              <option value="pragmatist"></option>
            </datalist>
          </div>
          <div class="form-field flex-1">
            <label class="field-label" for="pt-variant">{i18n.t('config.variant')}</label>
            <input id="pt-variant" type="text" class="field-input" bind:value={form.variant} placeholder="default" />
          </div>
          <div class="form-field flex-1">
            <label class="field-label" for="pt-language">Language</label>
            <input id="pt-language" type="text" class="field-input" bind:value={form.language} placeholder="de" maxlength="8" />
          </div>
        </div>

        <div class="form-field">
          <label class="field-label" for="pt-content">{i18n.t('config.prompt')} *</label>
          <textarea id="pt-content" class="field-input content-area" rows="10" bind:value={form.content} placeholder="You are a strategist. Reason step by step..."></textarea>
        </div>

        <div class="form-field">
          <label class="field-label" for="pt-description">{i18n.t('config.description')}</label>
          <textarea id="pt-description" class="field-input" rows="2" bind:value={form.description}></textarea>
        </div>

        <div class="form-field">
          <label class="field-label" for="pt-source">Source Path (optional)</label>
          <input id="pt-source" type="text" class="field-input" bind:value={form.source_path} placeholder="modules/agent-cores/strategist/system.md" />
        </div>

        <div class="form-field">
          <label class="field-label" for="pt-tags">Tags (comma-separated)</label>
          <input id="pt-tags" type="text" class="field-input" bind:value={form.tags} placeholder="default, system" />
        </div>
        </fieldset>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={onClose}>{i18n.t('common.cancel')}</button>
        {#if !formReadOnly}
          <button class="btn-primary" onclick={handleSave} disabled={saving}>
            {saving ? '…' : i18n.t('common.save')}
          </button>
        {/if}
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
    max-width: 720px;
    width: 94%;
    max-height: 92vh;
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
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .readonly-badge {
    font-size: 0.7rem;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(137, 180, 250, 0.15);
    color: var(--color-primary, #89b4fa);
    border: 1px solid var(--color-primary, #89b4fa);
  }
  .form-fieldset {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .form-fieldset:disabled {
    opacity: 0.85;
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
  .field-input, textarea.field-input {
    padding: 8px 12px;
    border: 1px solid var(--color-border, #313244);
    border-radius: 6px;
    background: var(--color-surface, #313244);
    color: var(--color-text, #cdd6f4);
    font-size: 0.875rem;
    font-family: inherit;
  }
  .field-input:focus, textarea.field-input:focus {
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
  textarea.content-area {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.85rem;
    line-height: 1.5;
    resize: vertical;
    min-height: 160px;
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

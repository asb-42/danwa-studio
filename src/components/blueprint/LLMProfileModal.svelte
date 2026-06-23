<script>
  import { i18n } from '../../lib/i18n/loader.js';
  import {
    createBlueprintLLMProfile,
    updateBlueprintLLMProfile,
  } from '../../lib/blueprint/api.js';

  let { profile = null, visible = false, onSuccess = () => {}, onClose = () => {} } = $props();

  let t = $derived((key, params) => $i18n.t(key, params));

  let isNew = $derived(!profile);
  let saving = $state(false);
  let error = $state(null);

  let form = $state({});

  let protocols = ['litellm', 'a2a'];
  let providers = ['openrouter', 'openai', 'anthropic', 'local', 'ollama', 'deepseek', 'xiaomi', 'opencode-zen', 'opencode-go', 'cloudflare'];
  let profileTypes = ['text', 'tts', 'stt'];

  $effect(() => {
    if (visible) {
      error = null;
      if (profile) {
        form = {
          name: profile.name || '',
          profile_type: profile.profile_type || 'text',
          provider: profile.provider || 'openrouter',
          model: profile.model || '',
          api_base: profile.api_base || '',
          api_key_env: profile.api_key_env || 'OPENROUTER_API_KEY',
          account_id_env: profile.account_id_env || '',
          temperature: profile.temperature ?? 0.7,
          max_tokens: profile.max_tokens ?? 4096,
          context_window: profile.context_window ?? null,
          timeout: profile.timeout ?? 600,
          protocol: profile.protocol || 'litellm',
          a2a_endpoint: profile.a2a_endpoint || '',
          fallback_llm_profile_id: profile.fallback_llm_profile_id || '',
        };
      } else {
        form = {
          name: '',
          profile_type: 'text',
          provider: 'openrouter',
          model: '',
          api_base: '',
          api_key_env: 'OPENROUTER_API_KEY',
          account_id_env: '',
          temperature: 0.7,
          max_tokens: 4096,
          context_window: null,
          timeout: 600,
          protocol: 'litellm',
          a2a_endpoint: '',
          fallback_llm_profile_id: '',
        };
      }
    }
  });

  async function handleSave() {
    saving = true;
    error = null;
    try {
      const payload = { ...form };
      if (isNew) {
        await createBlueprintLLMProfile(payload);
      } else {
        await updateBlueprintLLMProfile(profile.id, payload);
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
        <h2 class="modal-title">{isNew ? $i18n.t('llm_profiles.create') : $i18n.t('llm_profiles.edit')}</h2>
        <button class="close-btn" onclick={onClose} aria-label="Close">✕</button>
      </div>

      <div class="modal-body">
        <div class="form-field">
          <label class="field-label" for="lp-name">{$i18n.t('config.name')}</label>
          <input id="lp-name" type="text" class="field-input" bind:value={form.name} />
        </div>

        <div class="form-row">
          <div class="form-field flex-1">
            <label class="field-label" for="lp-provider">{$i18n.t('config.provider')}</label>
            <select id="lp-provider" class="field-select" bind:value={form.provider}>
              {#each providers as p}
                <option value={p}>{p}</option>
              {/each}
            </select>
          </div>
          <div class="form-field flex-1">
            <label class="field-label" for="lp-model">{$i18n.t('config.model')}</label>
            <input id="lp-model" type="text" class="field-input" bind:value={form.model} placeholder="anthropic/claude-3.5-sonnet" />
          </div>
        </div>

        <div class="form-field">
          <label class="field-label" for="lp-profile-type">{$i18n.t('config.profileType')}</label>
          <select id="lp-profile-type" class="field-select" bind:value={form.profile_type}>
            {#each profileTypes as pt}
              <option value={pt}>{pt}</option>
            {/each}
          </select>
        </div>

        <div class="form-field">
          <label class="field-label" for="lp-api-base">{$i18n.t('config.apiBase')}</label>
          <input id="lp-api-base" type="text" class="field-input" bind:value={form.api_base} placeholder="https://api.openrouter.ai" />
        </div>

        <div class="form-field">
          <label class="field-label" for="lp-api-key">{$i18n.t('config.apiKeyEnv')}</label>
          <input id="lp-api-key" type="text" class="field-input" bind:value={form.api_key_env} placeholder="OPENROUTER_API_KEY" />
        </div>

        {#if form.provider === 'cloudflare'}
          <div class="form-field">
            <label class="field-label" for="lp-account-id">{$i18n.t('config.accountIdEnv')}</label>
            <input id="lp-account-id" type="text" class="field-input" bind:value={form.account_id_env} placeholder="CLOUDFLARE_ACCOUNT_ID" />
          </div>
        {/if}

        <div class="form-row">
          <div class="form-field flex-1">
            <label class="field-label" for="lp-temperature">{$i18n.t('config.temperature')}</label>
            <input id="lp-temperature" type="number" class="field-input" bind:value={form.temperature} min="0" max="2" step="0.1" />
          </div>
          <div class="form-field flex-1">
            <label class="field-label" for="lp-max-tokens">{$i18n.t('config.maxTokens')}</label>
            <input id="lp-max-tokens" type="number" class="field-input" bind:value={form.max_tokens} min="1" step="1" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field flex-1">
            <label class="field-label" for="lp-context">{$i18n.t('config.contextWindow')}</label>
            <input id="lp-context" type="number" class="field-input" bind:value={form.context_window} min="0" step="1" placeholder="128000" />
          </div>
          <div class="form-field flex-1">
            <label class="field-label" for="lp-timeout">{$i18n.t('config.timeout')}</label>
            <input id="lp-timeout" type="number" class="field-input" bind:value={form.timeout} min="1" step="1" />
          </div>
        </div>

        <div class="form-field">
          <label class="field-label" for="lp-protocol">{$i18n.t('config.protocol')}</label>
          <select id="lp-protocol" class="field-select" bind:value={form.protocol}>
            {#each protocols as p}
              <option value={p}>{p}</option>
            {/each}
          </select>
        </div>

        {#if form.protocol === 'a2a'}
          <div class="form-field">
            <label class="field-label" for="lp-a2a">{$i18n.t('config.a2aEndpoint')}</label>
            <input id="lp-a2a" type="text" class="field-input" bind:value={form.a2a_endpoint} placeholder="http://agent.example.com" />
          </div>
        {/if}

        {#if error}
          <div class="form-error">{error}</div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={onClose}>{$i18n.t('common.cancel')}</button>
        <button class="btn-primary" onclick={handleSave} disabled={saving}>
          {saving ? '...' : (isNew ? $i18n.t('common.create') : $i18n.t('common.save'))}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1001;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
  }
  .modal-container {
    background: var(--color-bg, #1e1e2e);
    border: 1px solid var(--color-border, #313244);
    border-radius: 12px;
    width: 90vw;
    max-width: 580px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .modal-header {
    display: flex;
    align-items: flex-start;
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
  .field-input, .field-select {
    padding: 8px 12px;
    border: 1px solid var(--color-border, #313244);
    border-radius: 6px;
    background: var(--color-surface, #313244);
    color: var(--color-text, #cdd6f4);
    font-size: 0.875rem;
  }
  .field-input:focus, .field-select:focus {
    outline: none;
    border-color: var(--color-primary, #89b4fa);
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

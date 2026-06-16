<script>
  import { i18n } from '../../lib/i18n/loader.js';
  import { getModule, getModuleProfile } from '../../lib/modules/api.js';

  let { moduleInfo = null, visible = false, onClose = () => {} } = $props();

  let loading = $state(false);
  let error = $state(null);
  let detail = $state(null);
  let profile = $state(null);
  let activeTab = $state('overview'); // 'overview' | 'manifest' | 'profile'

  $effect(() => {
    if (visible && moduleInfo) {
      loadDetail(moduleInfo.module_id);
    }
  });

  async function loadDetail(moduleId) {
    loading = true;
    error = null;
    try {
      [detail, profile] = await Promise.all([
        getModule(moduleId),
        getModuleProfile(moduleId).catch((e) => {
          // Profile may not exist for all module types
          console.warn(`No profile for ${moduleId}:`, e.message);
          return null;
        }),
      ]);
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function prettyJson(obj) {
    if (obj == null) return '';
    return JSON.stringify(obj, null, 2);
  }
</script>

{#if visible}
  <div class="modal-overlay" role="dialog" aria-modal="true" onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}>
    <div class="modal-container wide" role="document" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <div class="flex-1">
          <h2 class="modal-title">
            {moduleInfo?.name || moduleInfo?.module_id}
            <span class="readonly-badge">🔒 read-only</span>
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
            {moduleInfo?.module_id} · v{moduleInfo?.version || '?'} · {moduleInfo?.type || '?'}
          </p>
        </div>
        <button class="close-btn" onclick={onClose} aria-label="Close">✕</button>
      </div>

      <!-- Tabs -->
      <div class="modal-tabs">
        <button class="tab" class:active={activeTab === 'overview'} onclick={() => (activeTab = 'overview')}>
          Overview
        </button>
        <button class="tab" class:active={activeTab === 'manifest'} onclick={() => (activeTab = 'manifest')}>
          Manifest (JSON)
        </button>
        <button class="tab" class:active={activeTab === 'profile'} onclick={() => (activeTab = 'profile')}>
          Profile (JSON)
        </button>
      </div>

      <div class="modal-body">
        {#if loading}
          <div class="flex items-center justify-center h-32">
            <p class="text-gray-500">{$i18n.t('common.loading')}</p>
          </div>
        {:else if error}
          <div class="form-error">{error}</div>
        {:else if activeTab === 'overview' && detail}
          <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div class="kv-label">ID</div><div class="kv-value font-mono">{detail.module_id}</div>
            <div class="kv-label">Name</div><div class="kv-value">{detail.name}</div>
            <div class="kv-label">Type</div><div class="kv-value">
              <span class="tag">{detail.type}</span>
            </div>
            <div class="kv-label">Category</div><div class="kv-value">{detail.category || '—'}</div>
            <div class="kv-label">Version</div><div class="kv-value font-mono">{detail.version || '—'}</div>
            <div class="kv-label">Language</div><div class="kv-value font-mono">{detail.language || '—'}</div>
            <div class="kv-label">Author</div><div class="kv-value">{detail.author || '—'}</div>
            <div class="kv-label">License</div><div class="kv-value font-mono">{detail.license || '—'}</div>
            <div class="kv-label">Installed</div><div class="kv-value">
              {#if detail.installed}
                <span class="tag tag-green">● yes</span>
              {:else}
                <span class="tag">○ no</span>
              {/if}
            </div>
            <div class="kv-label">Enabled</div><div class="kv-value">
              {#if detail.enabled}
                <span class="tag tag-green">● active</span>
              {:else}
                <span class="tag">○ disabled</span>
              {/if}
            </div>
            <div class="kv-label">File count</div><div class="kv-value font-mono">{detail.file_count ?? '—'}</div>
            <div class="kv-label">Installed at</div><div class="kv-value">{formatDate(detail.installed_at)}</div>
            <div class="kv-label">Updated at</div><div class="kv-value">{formatDate(detail.updated_at)}</div>
            <div class="kv-label">Description</div><div class="kv-value">{detail.description || '—'}</div>
            {#if detail.tags && detail.tags.length}
              <div class="kv-label">Tags</div>
              <div class="kv-value">
                {#each detail.tags as tag (tag)}
                  <span class="tag mr-1">{tag}</span>
                {/each}
              </div>
            {/if}
            {#if detail.dependencies && detail.dependencies.length}
              <div class="kv-label">Dependencies</div>
              <div class="kv-value">
                {#each detail.dependencies as dep (dep)}
                  <span class="tag font-mono mr-1">{dep}</span>
                {/each}
              </div>
            {/if}
            {#if detail.checksum}
              <div class="kv-label">Checksum</div>
              <div class="kv-value font-mono text-xs break-all">{detail.checksum}</div>
            {/if}
          </div>

          {#if detail.profile_preview}
            <div class="mt-4">
              <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Profile preview</h3>
              <pre class="json-block">{detail.profile_preview}</pre>
            </div>
          {/if}
        {:else if activeTab === 'manifest'}
          <pre class="json-block">{prettyJson(detail)}</pre>
        {:else if activeTab === 'profile'}
          {#if profile}
            <pre class="json-block">{prettyJson(profile)}</pre>
          {:else}
            <p class="text-gray-500">No profile available for this module type.</p>
          {/if}
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={onClose}>{$i18n.t('common.cancel')}</button>
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
  .modal-container.wide {
    max-width: 880px;
  }
  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border, #313244);
    gap: 12px;
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
  .modal-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border, #313244);
    padding: 0 20px;
    gap: 4px;
  }
  .tab {
    background: none;
    border: none;
    padding: 10px 14px;
    color: var(--color-text-muted, #6c7086);
    font-size: 0.875rem;
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }
  .tab:hover {
    color: var(--color-text, #cdd6f4);
  }
  .tab.active {
    color: var(--color-primary, #89b4fa);
    border-bottom-color: var(--color-primary, #89b4fa);
  }
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  }
  .kv-label {
    color: var(--color-text-muted, #6c7086);
    font-size: 0.8rem;
    padding: 4px 0;
  }
  .kv-value {
    color: var(--color-text, #cdd6f4);
    padding: 4px 0;
    word-break: break-word;
  }
  .tag {
    display: inline-block;
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--color-surface, #313244);
    color: var(--color-text-muted, #6c7086);
  }
  .tag-green {
    background: rgba(166, 227, 161, 0.15);
    color: #a6e3a1;
  }
  .form-error {
    padding: 8px 12px;
    border-radius: 6px;
    background: rgba(243, 139, 168, 0.1);
    border: 1px solid var(--color-error, #f38ba8);
    color: var(--color-error, #f38ba8);
    font-size: 0.85rem;
  }
  .json-block {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--color-border, #313244);
    border-radius: 6px;
    padding: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--color-text, #cdd6f4);
    overflow-x: auto;
    white-space: pre;
    margin: 0;
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
  .flex-1 { flex: 1; }
  .text-xs { font-size: 0.75rem; }
  .text-gray-500 { color: #6b7280; }
  .dark .text-gray-500 { color: #6c7086; }
  .text-gray-400 { color: #9ca3af; }
  .dark .text-gray-400 { color: #6c7086; }
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  .mt-1 { margin-top: 4px; }
  .mt-4 { margin-top: 16px; }
  .mb-2 { margin-bottom: 8px; }
  .mr-1 { margin-right: 4px; }
  .break-all { word-break: break-all; }
  .grid { display: grid; }
  .grid-cols-2 { grid-template-columns: max-content 1fr; }
  .gap-x-6 { column-gap: 24px; }
  .gap-y-2 { row-gap: 8px; }
  .uppercase { text-transform: uppercase; }
  .font-semibold { font-weight: 600; }
</style>

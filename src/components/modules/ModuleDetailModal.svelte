<script>
  import { i18n } from '../../lib/i18n/loader.js';
  import { getModule, getModuleProfile, updateModuleProfile } from '../../lib/modules/api.js';

  let { moduleInfo = null, visible = false, onClose = () => {} } = $props();

  let loading = $state(false);
  let error = $state(null);
  let detail = $state(null);
  let profile = $state(null);
  let activeTab = $state('overview'); // 'overview' | 'manifest' | 'profile'

  // Edit-mode state for the Profile tab
  let editing = $state(false);
  let draftJson = $state('');
  let draftError = $state(null);
  let saving = $state(false);
  let saveError = $state(null);
  let lastSavedAt = $state(null);

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

  // ── Edit mode ──────────────────────────────────────────────────────

  function startEdit() {
    draftJson = prettyJson(profile);
    draftError = null;
    saveError = null;
    editing = true;
  }

  function cancelEdit() {
    editing = false;
    draftJson = '';
    draftError = null;
    saveError = null;
  }

  let isDirty = $derived(
    editing && prettyJson(profile) !== draftJson,
  );

  function diffLines(a, b) {
    // Very small line-by-line diff: - removed, + added, ' ' same.
    const al = (a || '').split('\n');
    const bl = (b || '').split('\n');
    const max = Math.max(al.length, bl.length);
    const out = [];
    for (let i = 0; i < max; i++) {
      const lo = al[i] ?? '';
      const ln = bl[i] ?? '';
      if (lo === ln) {
        out.push({ kind: 'same', text: ln });
      } else {
        if (lo) out.push({ kind: 'del', text: lo });
        if (ln) out.push({ kind: 'add', text: ln });
      }
    }
    return out;
  }

  let diffResult = $derived(
    editing ? diffLines(prettyJson(profile), draftJson) : [],
  );

  async function saveEdit() {
    if (!moduleInfo?.module_id) return;
    saveError = null;
    let parsed;
    try {
      parsed = JSON.parse(draftJson);
    } catch (e) {
      draftError = `Invalid JSON: ${e.message}`;
      return;
    }
    if (
      typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)
    ) {
      draftError = 'Profile must be a JSON object at the top level';
      return;
    }
    saving = true;
    try {
      const resp = await updateModuleProfile(moduleInfo.module_id, parsed);
      profile = parsed;
      lastSavedAt = new Date();
      editing = false;
      // The response includes a server-side preview string; keep it
      // for status display.
      if (resp?.profile && typeof resp.profile === 'string') {
        // intentionally not overwriting `profile` (we already set it
        // to the parsed object above)
      }
    } catch (e) {
      saveError = e.message;
    } finally {
      saving = false;
    }
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
          {#if !profile}
            <p class="text-gray-500">No profile available for this module type.</p>
          {:else if !editing}
            <div class="flex items-center justify-between mb-2">
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {#if lastSavedAt}
                  <span class="text-green-600 dark:text-green-400">✓ saved {lastSavedAt.toLocaleTimeString()}</span>
                {/if}
              </div>
              <div class="flex gap-2">
                <button class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded" onclick={startEdit}>
                  ✎ Edit schema
                </button>
              </div>
            </div>
            <pre class="json-block">{prettyJson(profile)}</pre>
          {:else}
            <!-- Edit mode -->
            <div class="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <div class="flex items-center gap-2">
                {#if isDirty}
                  <span class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">● unsaved</span>
                {:else}
                  <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">✓ in sync</span>
                {/if}
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {draftJson.split('\n').length} lines
                </span>
              </div>
              <div class="flex gap-2">
                <button class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded" onclick={cancelEdit} disabled={saving}>
                  Cancel
                </button>
                <button class="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50" onclick={saveEdit} disabled={saving || !isDirty}>
                  {saving ? '…' : 'Save'}
                </button>
              </div>
            </div>
            {#if draftError}
              <div class="form-error mb-2">{draftError}</div>
            {/if}
            {#if saveError}
              <div class="form-error mb-2">⚠ Save failed: {saveError}</div>
            {/if}
            <div class="grid grid-cols-2 gap-3">
              <div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Editor (JSON)</div>
                <textarea
                  class="w-full h-96 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 font-mono text-xs"
                  spellcheck="false"
                  bind:value={draftJson}
                ></textarea>
              </div>
              <div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Diff (current → draft)</div>
                <pre class="json-block h-96 overflow-y-auto whitespace-pre">
{#each diffResult as line, i (i)}<span class={line.kind === 'add' ? 'text-green-600 dark:text-green-400' : line.kind === 'del' ? 'text-red-600 dark:text-red-400 line-through' : 'text-gray-500 dark:text-gray-400'}>
{line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' '} {line.text}
</span>
{/each}</pre>
              </div>
            </div>
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

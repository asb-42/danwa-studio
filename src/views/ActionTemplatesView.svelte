<script>
  /**
   * ActionTemplatesView — Manage action templates for the interactive debate mode.
   *
   * Allows admins to:
   * - View available action templates
   * - Enable/disable actions
   * - Customize roles and prompts
   * - Map actions to agent bundles
   */
  import { onMount } from 'svelte';
  import { i18n } from '../lib/i18n/loader.js';

  let t = $derived((key, params) => i18n.t(key, params));

  let templates = $state([]);
  let loading = $state(false);
  let selectedTemplate = $state(null);
  let editingAction = $state(null);

  // Default action templates (from danwa-modules)
  const defaultTemplates = [
    {
      template_id: 'default-interactive-actions',
      name: 'Default Interactive Actions',
      actions: [
        { id: 'agent-strategist', type: 'agent', label: 'Strategist Analysis', icon: '🧠', default_role: 'strategist', enabled: true },
        { id: 'agent-critic', type: 'agent', label: 'Critical Review', icon: '🔍', default_role: 'critic', enabled: true },
        { id: 'agent-optimist', type: 'agent', label: 'Positive Perspective', icon: '🌱', default_role: 'optimist', enabled: true },
        { id: 'agent-devils-advocate', type: 'agent', label: "Devil's Advocate", icon: '😈', default_role: 'devil', enabled: true },
        { id: 'agent-mediator', type: 'agent', label: 'Mediator Synthesis', icon: '🤝', default_role: 'mediator', enabled: true },
        { id: 'agent-creative', type: 'agent', label: 'Creative Brainstorm', icon: '💡', default_role: 'creative', enabled: true },
        { id: 'hitl-question', type: 'hitl', label: 'Ask User', icon: '👤', enabled: true },
        { id: 'a2a-external', type: 'a2a', label: 'External A2A Agent', icon: '🔗', enabled: true },
      ],
    },
  ];

  onMount(async () => {
    loading = true;
    try {
      // In production, fetch from API
      templates = defaultTemplates;
      selectedTemplate = templates[0];
    } finally {
      loading = false;
    }
  });

  function toggleAction(actionId) {
    if (!selectedTemplate) return;
    const action = selectedTemplate.actions.find((a) => a.id === actionId);
    if (action) {
      action.enabled = !action.enabled;
    }
  }

  function editAction(action) {
    editingAction = { ...action };
  }

  function saveAction() {
    if (!selectedTemplate || !editingAction) return;
    const idx = selectedTemplate.actions.findIndex((a) => a.id === editingAction.id);
    if (idx >= 0) {
      selectedTemplate.actions[idx] = { ...editingAction };
    }
    editingAction = null;
  }

  function getTypeIcon(type) {
    return type === 'agent' ? '🤖' : type === 'a2a' ? '🔗' : '👤';
  }

  function getTypeLabel(type) {
    return type === 'agent' ? 'Agent (LLM)' : type === 'a2a' ? 'A2A Agent' : 'Human';
  }
</script>

<div class="action-templates-view p-6 max-w-6xl mx-auto">
  <header class="mb-8">
    <h1 class="text-2xl font-bold text-gray-900">Action Templates</h1>
    <p class="text-gray-600 mt-2">
      Manage the actions available in the [+] forking menu of the interactive debate mode.
    </p>
  </header>

  {#if loading}
    <div class="text-center py-12 text-gray-500">Loading...</div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Template list -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <h2 class="text-sm font-semibold text-gray-700 mb-3">Templates</h2>
          {#each templates as tpl}
            <button
              class="w-full text-left px-3 py-2 rounded-lg mb-2 transition-colors
                {selectedTemplate?.template_id === tpl.template_id
                ? 'bg-blue-50 border border-blue-200'
                : 'hover:bg-gray-50'}"
              onclick={() => (selectedTemplate = tpl)}
            >
              <div class="font-medium text-sm">{tpl.name}</div>
              <div class="text-xs text-gray-500">{tpl.actions.length} Actions</div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Action list -->
      <div class="lg:col-span-2">
        {#if selectedTemplate}
          <div class="bg-white rounded-xl border border-gray-200 p-4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold">{selectedTemplate.name}</h2>
              <span class="text-sm text-gray-500">
                {selectedTemplate.actions.filter((a) => a.enabled).length} / {selectedTemplate.actions.length} enabled
              </span>
            </div>

            <div class="space-y-3">
              {#each selectedTemplate.actions as action}
                <div
                  class="flex items-center gap-4 p-3 rounded-lg border transition-colors
                    {action.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}"
                >
                  <span class="text-2xl">{action.icon}</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm">{action.label}</div>
                    <div class="text-xs text-gray-500">
                      {getTypeLabel(action.type)}
                      {#if action.default_role}
                        · Role: {action.default_role}
                      {/if}
                    </div>
                  </div>
                  <button
                    class="px-3 py-1 text-xs rounded-lg border
                      {action.enabled
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-gray-100 text-gray-500'}"
                    onclick={() => toggleAction(action.id)}
                  >
                    {action.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button
                    class="px-3 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
                    onclick={() => editAction(action)}
                  >
                    Edit
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="text-center py-12 text-gray-500">Select a template</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Edit Modal -->
{#if editingAction}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    onclick={(e) => {
      if (e.target === e.currentTarget) editingAction = null;
    }}
  >
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
      <h2 class="text-lg font-semibold mb-4">Edit Action</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Label</label>
          <input
            type="text"
            bind:value={editingAction.label}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {#if editingAction.type === 'agent'}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Default Role</label>
            <input
              type="text"
              bind:value={editingAction.default_role}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        {/if}

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Icon</label>
          <input
            type="text"
            bind:value={editingAction.icon}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button
          class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          onclick={() => (editingAction = null)}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          onclick={saveAction}
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}

<script>
  /**
   * InputComposerView — plugin-based input capture with workflow bridge.
   *
   * Dual-mode page:
   * - "form" mode: simple debate creation form (inline, no external deps)
   * - "compose" mode: full Input Composer with plugin selector, STT, A2A, workflow templates
   */
  import { onMount, onDestroy } from 'svelte';
  import { i18n } from '../lib/i18n/loader.js';
  import { activeCase, currentDebate, debates, autoStartDebate, error as errorStore } from '../lib/stores.js';
  import {
    listInputPlugins,
    submitInput,
    launchWorkflow,
    getInputJobStatus,
    listInputJobs,
    approveA2A,
    rejectA2A,
  } from '../lib/input/inputApi.js';
  import { createInputJobTracker } from '../lib/input/inputJobStore.js';
  import { listWorkflowTemplates } from '../lib/blueprint/api.js';
  import PluginSelector from '../components/input/PluginSelector.svelte';
  import STTMicrophoneButton from '../components/input/STTMicrophoneButton.svelte';
  import A2AApprovalCard from '../components/input/A2AApprovalCard.svelte';
  import WorkflowTemplatePicker from '../components/input/WorkflowTemplatePicker.svelte';
  import DebateExecutionDisplay from '../components/blueprint/DebateExecutionDisplay.svelte';
  import PhaseSnapshotsWidget from '../components/workflow/PhaseSnapshotsWidget.svelte';

  let { navigate = () => {} } = $props();

  // Input Composer state
  let plugins = $state([]);
  let selectedPlugin = $state('standard_text');
  let topic = $state('');
  let loading = $state(false);
  let error = $state(null);
  let activeJob = $state(null);
  let tracker = $state(null);
  let partialText = $state('');

  // A2A approval state
  let pendingA2A = $state([]);

  // Workflow template state
  let selectedTemplateId = $state('');
  let workflowTemplates = $state([]);

  // Workflow execution state
  let showExecutionPanel = $state(false);
  let executionSessionId = $state(null);
  let currentDebateTitle = $state('');
  let currentDebateId = $state(null);
  let launchError = $state(null);

  // Mode toggle: 'compose' (Input Composer) or 'form' (simple debate creation)
  let inputMode = $state('form');

  // Simple form mode state
  let formCaseText = $state('');
  let formMaxRounds = $state(3);
  let formConsensusThreshold = $state(0.8);

  // A2A polling
  let a2aPollInterval = $state(null);

  onMount(() => {
    listInputPlugins()
      .then((p) => { plugins = p; })
      .catch((e) => { error = e.message; });

    listWorkflowTemplates()
      .then((templates) => {
        workflowTemplates = templates || [];
        if (!selectedTemplateId && workflowTemplates.length > 0) {
          selectedTemplateId = workflowTemplates[0].id;
        }
      })
      .catch((e) => {
        console.warn('[InputComposer] Failed to load workflow templates:', e);
        error = e.message || 'Failed to load workflow templates';
      });

    startA2APolling();
    return () => stopA2APolling();
  });

  onDestroy(() => stopA2APolling());

  // --- A2A Polling ---

  function startA2APolling() {
    if (a2aPollInterval) return;
    pollPendingA2A();
    a2aPollInterval = setInterval(pollPendingA2A, 5000);
  }

  function stopA2APolling() {
    if (a2aPollInterval) {
      clearInterval(a2aPollInterval);
      a2aPollInterval = null;
    }
  }

  async function pollPendingA2A() {
    try {
      const jobs = await listInputJobs({ status: 'pending_approval', pluginKey: 'a2a_inbound' });
      pendingA2A = (jobs || []).map((j) => ({
        job_id: j.job_id,
        agent_id: j.processed_input?.source_metadata?.agent_id || 'unknown',
        topic: j.processed_input?.topic || '',
        task_id: j.job_id,
      }));
    } catch { /* server may not be ready */ }
  }

  // --- Plugin / STT handlers ---

  function onPluginChange(key) {
    selectedPlugin = key;
    error = null;
  }

  function onPartial(text) { partialText = text; }

  function onFinal(text) {
    if (text) topic += (topic ? ' ' : '') + text;
    partialText = '';
  }

  function onTemplateChange(id) { selectedTemplateId = id; }

  // --- Submit & Launch ---

  async function handleSubmit() {
    if (!topic.trim()) {
      error = 'Please enter a debate topic.';
      return;
    }
    loading = true;
    error = null;
    launchError = null;
    try {
      const result = await submitInput(selectedPlugin, {}, topic.trim());
      activeJob = result;

      if (result.status === 'completed') {
        await handleLaunch(result.job_id);
      } else if (result.status === 'processing' || result.status === 'pending_approval') {
        tracker = createInputJobTracker(result.job_id);
        pollAndLaunch(result.job_id);
      }
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function pollAndLaunch(jobId) {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const job = await getInputJobStatus(jobId);
        if (job.status === 'completed') {
          await handleLaunch(jobId);
          return;
        } else if (job.status === 'failed') {
          error = job.error_message || 'Input processing failed';
          return;
        }
      } catch (e) {
        error = e.message;
        return;
      }
    }
    error = 'Input processing timed out';
  }

  async function handleLaunch(jobId) {
    launchError = null;
    try {
      const options = { language: 'en' };
      if (selectedTemplateId) {
        options.workflow_template_id = selectedTemplateId;
      }
      const result = await launchWorkflow(jobId, options);
      executionSessionId = result.session_id;
      currentDebateTitle = result.title || '';
      currentDebateId = result.debate_id || null;
      showExecutionPanel = true;
    } catch (e) {
      launchError = e.message || 'Failed to launch workflow';
      error = launchError;
    }
  }

  // --- A2A Approval ---

  async function handleApproveA2A(taskId) {
    try {
      await approveA2A(taskId);
      pendingA2A = pendingA2A.filter(p => p.task_id !== taskId);
      tracker = createInputJobTracker(taskId);
      pollAndLaunch(taskId);
    } catch (e) {
      error = e.message;
    }
  }

  async function handleRejectA2A(taskId) {
    try {
      await rejectA2A(taskId);
      pendingA2A = pendingA2A.filter(p => p.task_id !== taskId);
    } catch (e) {
      error = e.message;
    }
  }

  // --- Simple form mode: create debate directly ---

  async function handleFormSubmit() {
    if (!formCaseText.trim()) {
      error = 'Please enter a case description.';
      return;
    }
    loading = true;
    error = null;
    try {
      // Use standard_text plugin via the Input Composer pipeline
      const result = await submitInput('standard_text', {}, formCaseText.trim());
      activeJob = result;
      if (result.status === 'completed') {
        await handleLaunch(result.job_id);
      }
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-4xl mx-auto p-6 space-y-6">
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
    🎤 {i18n.t('nav.input_composer')}
  </h1>

  <!-- Mode Toggle -->
  <div class="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
    <button
      class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
        {inputMode === 'form'
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-b-2 border-blue-600'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
      onclick={() => inputMode = 'form'}
    >
      {i18n.t('debate.newDebate')}
    </button>
    <button
      class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
        {inputMode === 'compose'
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-b-2 border-blue-600'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
      onclick={() => inputMode = 'compose'}
    >
      🎤 Input Composer
    </button>
  </div>

  <!-- Simple form mode (default) -->
  {#if inputMode === 'form'}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">{i18n.t('debate.newDebate')}</h3>
      <form onsubmit={(e) => { e.preventDefault(); handleFormSubmit(); }} class="space-y-4">
        <div>
          <label for="case-text" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {i18n.t('debate.caseLabel')}
          </label>
          <textarea
            id="case-text"
            bind:value={formCaseText}
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
            placeholder={i18n.t('debate.casePlaceholder')}
          ></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="max-rounds" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {i18n.t('debate.maxRounds')}
            </label>
            <input id="max-rounds" type="number" bind:value={formMaxRounds} min="1" max="10"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label for="consensus-threshold" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {i18n.t('debate.consensusThreshold')}
            </label>
            <input id="consensus-threshold" type="number" bind:value={formConsensusThreshold} min="0" max="1" step="0.1"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
        <button type="submit" disabled={loading || !formCaseText.trim()}
          class="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {loading ? '🔄 Processing…' : `▶️ ${i18n.t('debate.createButton')}`}
        </button>
      </form>
    </div>
  {/if}

  <!-- Input Composer mode (advanced — all plugins) -->
  {#if inputMode === 'compose'}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Input Source</h2>
      <div class="mb-4">
        <PluginSelector {plugins} selectedKey={selectedPlugin} onchange={onPluginChange} />
      </div>

      <!-- Textarea with STT button -->
      <div class="mb-4 relative">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="topic-input">
          {i18n.t('debate.caseLabel')}
        </label>
        <textarea
          id="topic-input"
          bind:value={topic}
          placeholder={i18n.t('debate.casePlaceholder')}
          rows="8"
          maxlength="5000"
          class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-y"
        ></textarea>
        {#if partialText}
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">🎙️ {partialText}</p>
        {/if}
        <div class="absolute bottom-3 right-3">
          <STTMicrophoneButton onPartial={onPartial} onFinal={onFinal} />
        </div>
      </div>

      <!-- Workflow Template Picker -->
      <div class="mb-4">
        <WorkflowTemplatePicker templates={workflowTemplates} selectedId={selectedTemplateId} onchange={onTemplateChange} />
      </div>

      <!-- Error -->
      {#if error}
        <div class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      {/if}

      <!-- Submit Button -->
      <div class="mb-4">
        <button
          onclick={handleSubmit}
          disabled={loading || !topic.trim()}
          class="px-6 py-2.5 rounded-lg bg-green-600 text-white font-medium text-sm
            hover:bg-green-700 disabled:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {#if loading}
            🔄 Processing…
          {:else}
            ▶️ {i18n.t('debate.startButton') || 'Start Debate'}
          {/if}
        </button>
      </div>

      <!-- Job Status -->
      {#if tracker}
        <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Status: <span class="font-mono">{tracker.status}</span>
          </p>
          {#if tracker.error}
            <p class="text-sm text-red-500 mt-1">{tracker.error}</p>
          {/if}
        </div>
      {/if}
    </div>

    <!-- A2A Approval Section -->
    {#if pendingA2A.length > 0}
      <div class="space-y-3">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-white">
          🤖 Pending A2A Requests ({pendingA2A.length})
        </h2>
        {#each pendingA2A as a2a}
          <A2AApprovalCard
            jobId={a2a.task_id}
            agentId={a2a.agent_id}
            topic={a2a.topic}
            onApprove={() => handleApproveA2A(a2a.task_id)}
            onReject={() => handleRejectA2A(a2a.task_id)}
          />
        {/each}
      </div>
    {/if}

    <!-- A2A Info -->
    <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🤖 A2A Inbound</h3>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        External agents can submit debate topics via the A2A protocol.
        Pending requests will appear above for approval.
      </p>
    </div>

    <!-- Execution results -->
    {#if showExecutionPanel}
      <DebateExecutionDisplay
        sessionId={executionSessionId}
        debateTitle={currentDebateTitle}
        debateId={currentDebateId}
        context={topic}
        onclose={() => { showExecutionPanel = false; executionSessionId = null; currentDebateTitle = ''; currentDebateId = null; }}
      />
      <div class="mt-3">
        <PhaseSnapshotsWidget sessionId={executionSessionId} />
      </div>
    {/if}
  {/if}
</div>

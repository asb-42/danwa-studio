<script>
  /**
   * TTSEngineSelector - Component for selecting TTS engine and voice
   * Uses adapter-based TTS endpoints
   */
  import { onMount } from 'svelte';
  import { listTTSEngines, listTTSVoices } from '../../lib/tts/api.js';

  let {
    value = '',
    onchange = () => {},
    disabled = false,
  } = $props();

  let engines = $state([]);
  let voices = $state([]);
  let loading = $state(false);
  let loadingVoices = $state(false);
  let error = $state(null);

  // Parse "engine:voice" format
  let selectedEngine = $state('');
  let selectedVoice = $state('');

  $effect(() => {
    if (value) {
      const parts = value.split(':');
      selectedEngine = parts[0] || '';
      selectedVoice = parts.slice(1).join(':') || '';
    } else {
      selectedEngine = '';
      selectedVoice = '';
    }
  });

  $effect(() => {
    const newValue = selectedEngine && selectedVoice
      ? `${selectedEngine}:${selectedVoice}`
      : selectedEngine || '';
    if (newValue !== value) {
      onchange(newValue);
    }
  });

  onMount(async () => {
    loading = true;
    error = null;
    try {
      engines = await listTTSEngines();
    } catch (e) {
      error = e.message;
      engines = [];
    } finally {
      loading = false;
    }
  });

  async function handleEngineChange(engineId) {
    selectedEngine = engineId;
    selectedVoice = '';
    voices = [];

    if (!engineId) return;

    loadingVoices = true;
    try {
      voices = await listTTSVoices(engineId);
    } catch (e) {
      console.warn('Failed to load voices:', e.message);
      voices = [];
    } finally {
      loadingVoices = false;
    }
  }

  function getEngineInfo(engineId) {
    return engines.find((e) => e.id === engineId);
  }

  function getLicenseBadgeClass(licenseType) {
    switch (licenseType) {
      case 'open_source': return 'badge-green';
      case 'non-commercial': return 'badge-yellow';
      case 'commercial': return 'badge-red';
      default: return 'badge-gray';
    }
  }

  function getLicenseLabel(licenseType) {
    switch (licenseType) {
      case 'open_source': return 'OSS';
      case 'non-commercial': return 'Non-commercial';
      case 'commercial': return 'Commercial';
      default: return licenseType || 'Unknown';
    }
  }
</script>

<div class="tts-selector">
  {#if loading}
    <div class="loading">Loading TTS engines...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else}
    <div class="field-group">
      <label class="field-label" for="tts-engine-select">Engine</label>
      <select
        id="tts-engine-select"
        class="field-select"
        bind:value={selectedEngine}
        onchange={(e) => handleEngineChange(e.target.value)}
        {disabled}
      >
        <option value="">— none —</option>
        {#each engines as engine (engine.id)}
          <option value={engine.id}>
            {engine.name}
            {#if engine.license_type}
              ({getLicenseLabel(engine.license_type)})
            {/if}
          </option>
        {/each}
      </select>

      {#if selectedEngine}
        {@const engineInfo = getEngineInfo(selectedEngine)}
        {#if engineInfo}
          <div class="engine-info">
            <span class="license-badge {getLicenseBadgeClass(engineInfo.license_type)}">
              {getLicenseLabel(engineInfo.license_type)}
            </span>
            {#if engineInfo.supports_style_hints}
              <span class="feature-badge">Style hints</span>
            {/if}
            {#if engineInfo.requires_attribution}
              <span class="attribution-notice">Requires attribution</span>
            {/if}
          </div>
        {/if}
      {/if}
    </div>

    {#if selectedEngine}
      <div class="field-group">
        <label class="field-label" for="tts-voice-select">
          Voice
          {#if loadingVoices}
            <span class="loading-inline">(loading...)</span>
          {/if}
        </label>
        <select
          id="tts-voice-select"
          class="field-select"
          bind:value={selectedVoice}
          disabled={disabled || loadingVoices || !selectedEngine}
        >
          <option value="">— select voice —</option>
          {#each voices as voice (voice.id)}
            <option value={voice.id}>
              {voice.name}
              {#if voice.language}
                ({voice.language})
              {/if}
              {#if voice.gender}
                · {voice.gender}
              {/if}
            </option>
          {/each}
        </select>

        {#if selectedVoice}
          {@const voice = voices.find((v) => v.id === selectedVoice)}
          {#if voice?.preview_url}
            <audio controls src={voice.preview_url} class="voice-preview">
              <track kind="captions" />
            </audio>
          {/if}
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .tts-selector {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-label {
    font-size: 11px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .field-select {
    padding: 6px 8px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    background: white;
    color: #1f2937;
  }

  :global(.dark) .field-select {
    background: #1f2937;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  .engine-info {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    font-size: 11px;
  }

  .license-badge {
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 10px;
    text-transform: uppercase;
  }

  .badge-green {
    background: #dcfce7;
    color: #166534;
  }

  .badge-yellow {
    background: #fef9c3;
    color: #854d0e;
  }

  .badge-red {
    background: #fee2e2;
    color: #991b1b;
  }

  .badge-gray {
    background: #f3f4f6;
    color: #374151;
  }

  :global(.dark) .badge-green {
    background: rgba(34, 197, 94, 0.2);
    color: #86efac;
  }

  :global(.dark) .badge-yellow {
    background: rgba(234, 179, 8, 0.2);
    color: #fde047;
  }

  :global(.dark) .badge-red {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
  }

  :global(.dark) .badge-gray {
    background: rgba(107, 114, 128, 0.2);
    color: #9ca3af;
  }

  .feature-badge {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    background: #e0e7ff;
    color: #3730a3;
  }

  :global(.dark) .feature-badge {
    background: rgba(99, 102, 241, 0.2);
    color: #a5b4fc;
  }

  .attribution-notice {
    font-size: 10px;
    color: #6b7280;
    font-style: italic;
  }

  .loading, .error {
    font-size: 12px;
    padding: 8px;
    border-radius: 6px;
  }

  .loading {
    background: #f3f4f6;
    color: #6b7280;
  }

  .error {
    background: #fef2f2;
    color: #ef4444;
  }

  :global(.dark) .loading {
    background: rgba(107, 114, 128, 0.2);
    color: #9ca3af;
  }

  :global(.dark) .error {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
  }

  .loading-inline {
    font-weight: normal;
    font-size: 10px;
    color: #9ca3af;
  }

  .voice-preview {
    margin-top: 8px;
    height: 32px;
    width: 100%;
  }
</style>

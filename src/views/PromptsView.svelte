<script>
  import { i18n } from '../lib/i18n/loader.js';
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900">{$i18n.t('nav.prompts')}</h1>
    <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Neu erstellen</button>
  </div>

  <div class="bg-white rounded-lg border border-gray-200 p-8 text-center">
    <div class="text-6xl mb-4">💬</div>
    <h2 class="text-xl font-semibold text-gray-900">Prompt Templates</h2>
    <p class="text-gray-500 mt-2">Prompt-Varianten, i18n, Live-Test</p>
    <p class="text-sm text-gray-400 mt-4">In Entwicklung - Sprint 1</p>
  </div>
</div>

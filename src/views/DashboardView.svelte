<script>
  import { i18n } from '../lib/i18n/loader.js';
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900">{$i18n.t('nav.dashboard')}</h1>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <div class="bg-white p-6 rounded-lg border border-gray-200">
      <h3 class="text-sm font-medium text-gray-500">Aktive Workflows</h3>
      <p class="text-3xl font-bold text-gray-900 mt-2">12</p>
    </div>
    <div class="bg-white p-6 rounded-lg border border-gray-200">
      <h3 class="text-sm font-medium text-gray-500">Module insgesamt</h3>
      <p class="text-3xl font-bold text-gray-900 mt-2">847</p>
    </div>
    <div class="bg-white p-6 rounded-lg border border-gray-200">
      <h3 class="text-sm font-medium text-gray-500">Blueprints</h3>
      <p class="text-3xl font-bold text-gray-900 mt-2">23</p>
    </div>
    <div class="bg-white p-6 rounded-lg border border-gray-200">
      <h3 class="text-sm font-medium text-gray-500">Prompt Varianten</h3>
      <p class="text-3xl font-bold text-gray-900 mt-2">156</p>
    </div>
  </div>

  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <h2 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <a href="#/blueprints" class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <h3 class="font-medium text-gray-900">Neues Blueprint erstellen</h3>
        <p class="text-sm text-gray-500 mt-1">Visueller Workflow-Editor</p>
      </a>
      <a href="#/agents" class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <h3 class="font-medium text-gray-900">Agent Persona anlegen</h3>
        <p class="text-sm text-gray-500 mt-1">Neue Agent-Rolle definieren</p>
      </a>
      <a href="#/prompts" class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <h3 class="font-medium text-gray-900">Prompt Template erstellen</h3>
        <p class="text-sm text-gray-500 mt-1">Neue Prompt-Variante</p>
      </a>
    </div>
  </div>
</div>
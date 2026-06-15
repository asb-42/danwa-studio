<script>
  import { i18n } from '../lib/i18n/loader.js';
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900">{$i18n.t('nav.my_keys')}</h1>
  </div>

  <div class="bg-white rounded-lg border border-gray-200 p-8">
    <p class="text-gray-600 mb-6">Verwalten Sie Ihre eigenen API-Keys (BYOK). Diese haben Vorrang vor den Server-Keys.</p>
    <div class="bg-gray-50 rounded-lg p-4 text-center">
      <p class="text-gray-500">In Entwicklung</p>
    </div>
  </div>
</div>
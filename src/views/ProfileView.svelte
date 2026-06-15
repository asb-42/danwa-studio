<script>
  import { i18n } from '../lib/i18n/loader.js';

  export { user };
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900">{$i18n.t('nav.profile')}</h1>
  </div>

  <div class="bg-white rounded-lg border border-gray-200 p-8">
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">Benutzerprofil</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-500">E-Mail</label>
          <p class="text-gray-900">{$user?.email}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-500">Rolle</label>
          <p class="text-gray-900">{$user?.role}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-500">Tenant</label>
          <p class="text-gray-900">{$user?.tenant_id}</p>
        </div>
      </div>
    </div>
  </div>
</div>
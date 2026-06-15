<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { user } from '../stores.js';

  export { user };
</script>

<header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
  <div class="flex items-center gap-4">
    <h1 class="text-xl font-bold text-gray-900">Danwa Studio</h1>
    <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Admin/Dev</span>
  </div>

  <div class="flex items-center gap-4">
    {#if $user}
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-600">{$user.email}</span>
        <span class="px-2 py-1 text-xs font-medium rounded-full
          {$user.role === 'admin' ? 'bg-red-100 text-red-800' : ''}
          {$user.role === 'editor' ? 'bg-green-100 text-green-800' : ''}
          {$user.role === 'viewer' ? 'bg-gray-100 text-gray-800' : ''}
        ">
          {$user.role}
        </span>
        <a href="#/profile" class="text-sm text-gray-600 hover:text-gray-900">{$i18n.t('nav.profile')}</a>
        <a href="#/my-keys" class="text-sm text-gray-600 hover:text-gray-900">{$i18n.t('nav.my_keys')}</a>
        <button class="text-sm text-gray-600 hover:text-gray-900" onclick={() => { $user = null; window.location.hash = '/login'; }}>
          {$i18n.t('common.logout')}
        </button>
      </div>
    {/if}
  </div>
</header>
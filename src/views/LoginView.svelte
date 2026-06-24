<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { login as loginRequest } from '../lib/api/auth.js';

  // Svelte 5: $bindable() lives inside $props()
  let { user = $bindable(null) } = $props();

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleLogin() {
    error = '';
    loading = true;
    try {
      // login() does a pre-flight /health check + sets the auth
      // store on success (see src/lib/api/auth.js).
      const loggedInUser = await loginRequest(email, password);
      user = loggedInUser;
      window.location.hash = '/';
    } catch (e) {
      // Map the localized 'Backend connection lost' diagnostic to a
      // user-actionable hint. Anything else (e.g. 'Invalid
      // credentials' from the backend) passes through unchanged.
      if (e && /Backend connection lost/i.test(e.message)) {
        error = i18n.t('auth.login.backendDown');
      } else {
        error = (e && e.message) || i18n.t('auth.login.failed');
      }
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
  <div class="max-w-md w-full space-y-8">
    <div>
      <h2 class="text-center text-3xl font-bold text-gray-900">Danwa Studio</h2>
      <p class="text-center text-gray-600 mt-2">Admin/Dev Interface</p>
    </div>

    <form class="mt-8 space-y-6" onsubmit={e => { e.preventDefault(); handleLogin(); }}>
      {#if error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      {/if}

      <div class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">E-Mail</label>
          <input
            id="email"
            type="email"
            autocomplete="email"
            required
            bind:value={email}
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="admin@example.com"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Passwort</label>
          <input
            id="password"
            type="password"
            autocomplete="current-password"
            required
            bind:value={password}
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="••••••••"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? i18n.t('common.loading') : i18n.t('common.login')}
      </button>
    </form>

    <p class="text-center text-sm text-gray-500">
      Demo: admin@danwa.local / admin123
    </p>
  </div>
</div>
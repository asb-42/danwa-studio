<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import { getMe, updateMe, changePassword } from '../lib/admin/api.js';

  let t = $derived((key, params) => i18n.t(key, params));

  let me = $state(null);
  let loading = $state(false);
  let saving = $state(false);
  let changingPw = $state(false);

  // Edit form
  let formDisplayName = $state('');
  let formEmail = $state('');

  // Password form
  let pwCurrent = $state('');
  let pwNew = $state('');
  let pwConfirm = $state('');

  onMount(loadMe);

  async function loadMe() {
    loading = true;
    try {
      me = await getMe();
      formDisplayName = me?.display_name || '';
      formEmail = me?.email || '';
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loading = false;
    }
  }

  async function handleSave() {
    saving = true;
    try {
      await updateMe({ display_name: formDisplayName || null, email: formEmail || null });
      await loadMe();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      saving = false;
    }
  }

  async function handleChangePassword() {
    if (!pwCurrent || !pwNew) {
      errorStore.set('current + new password required');
      return;
    }
    if (pwNew.length < 8) {
      errorStore.set('new password must be ≥ 8 characters');
      return;
    }
    if (pwNew !== pwConfirm) {
      errorStore.set('new passwords do not match');
      return;
    }
    changingPw = true;
    try {
      await changePassword(pwCurrent, pwNew);
      pwCurrent = '';
      pwNew = '';
      pwConfirm = '';
      errorStore.set('Password changed');
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      changingPw = false;
    }
  }

  function roleBadge(role) {
    if (role === 'admin') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (role === 'editor') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{i18n.t('nav.profile')}</h1>
    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Your account and password.</p>
  </div>

  {#if loading}
    <p class="text-gray-500 text-sm">{i18n.t('common.loading')}</p>
  {:else if !me}
    <div class="form-error">Could not load your profile. Are you signed in?</div>
  {:else}
    <!-- Account card -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{me.display_name || me.email}</h2>
        <span class="text-xs px-2 py-0.5 rounded-full {roleBadge(me.role)}">{me.role}</span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div class="kv-card"><div class="kv-label">User ID</div><div class="kv-value font-mono text-xs">{me.user_id || me.id || '—'}</div></div>
        <div class="kv-card"><div class="kv-label">Created</div><div class="kv-value text-xs">{me.created_at?.slice(0, 10) || '—'}</div></div>
        <div class="kv-card"><div class="kv-label">Last login</div><div class="kv-value text-xs">{me.last_login_at?.slice(0, 16) || '—'}</div></div>
        <div class="kv-card"><div class="kv-label">Active</div><div class="kv-value">{me.is_active === false ? 'no' : 'yes'}</div></div>
      </div>
    </div>

    <!-- Edit form -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Edit profile</h2>
      <div class="grid grid-cols-2 gap-2">
        <div class="form-field">
          <label class="field-label" for="me-name">Display name</label>
          <input id="me-name" type="text" class="field-input" bind:value={formDisplayName} />
        </div>
        <div class="form-field">
          <label class="field-label" for="me-email">Email</label>
          <input id="me-email" type="email" class="field-input" bind:value={formEmail} />
        </div>
      </div>
      <div class="flex justify-end">
        <button class="btn-primary" onclick={handleSave} disabled={saving}>
          {saving ? '…' : 'Save profile'}
        </button>
      </div>
    </div>

    <!-- Password form -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Change password</h2>
      <div class="form-field">
        <label class="field-label" for="pw-cur">Current password</label>
        <input id="pw-cur" type="password" class="field-input" bind:value={pwCurrent} />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="form-field">
          <label class="field-label" for="pw-new">New password (≥ 8 chars)</label>
          <input id="pw-new" type="password" class="field-input" bind:value={pwNew} />
        </div>
        <div class="form-field">
          <label class="field-label" for="pw-con">Confirm new password</label>
          <input id="pw-con" type="password" class="field-input" bind:value={pwConfirm} />
        </div>
      </div>
      <div class="flex justify-end">
        <button class="btn-primary" onclick={handleChangePassword} disabled={changingPw}>
          {changingPw ? '…' : 'Update Password'}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .form-field { display: flex; flex-direction: column; gap: 4px; }
  .field-label { font-size: 0.8rem; font-weight: 500; color: var(--color-text, #cdd6f4); }
  .field-input {
    padding: 8px 12px; border: 1px solid var(--color-border, #313244); border-radius: 6px;
    background: var(--color-surface, #313244); color: var(--color-text, #cdd6f4);
    font-size: 0.875rem; font-family: inherit;
  }
  .field-input:focus { outline: none; border-color: var(--color-primary, #89b4fa); }
  .btn-primary {
    padding: 8px 16px; border: none; border-radius: 6px;
    background: var(--color-primary, #89b4fa); color: var(--color-bg, #1e1e2e);
    font-size: 0.875rem; font-weight: 600; cursor: pointer;
  }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .kv-card {
    background: rgba(137, 180, 250, 0.05);
    border: 1px solid var(--color-border, #313244);
    border-radius: 6px;
    padding: 8px 10px;
  }
  .kv-label { font-size: 0.7rem; color: var(--color-text-muted, #6c7086); text-transform: uppercase; }
  .kv-value { font-size: 0.95rem; color: var(--color-text, #cdd6f4); margin-top: 2px; }
  .form-error {
    padding: 8px 12px; border-radius: 6px;
    background: rgba(243, 139, 168, 0.1); border: 1px solid var(--color-error, #f38ba8);
    color: var(--color-error, #f38ba8); font-size: 0.85rem;
  }
</style>

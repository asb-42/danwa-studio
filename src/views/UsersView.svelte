<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { onMount } from 'svelte';
  import { error as errorStore } from '../lib/stores.js';
  import { listUsers, inviteUser, changePassword } from '../lib/admin/api.js';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  let t = $derived((key, params) => i18n.t(key, params));

  let users = $state([]);
  let loading = $state(false);

  // Invite form
  let showInvite = $state(false);
  let inviteEmail = $state('');
  let inviteDisplayName = $state('');
  let invitePassword = $state('');
  let inviteRole = $state('viewer');
  let inviting = $state(false);

  // Change-password form
  let showPwForm = $state(false);
  let pwCurrent = $state('');
  let pwNew = $state('');
  let pwConfirm = $state('');
  let changingPw = $state(false);

  // Filter
  let roleFilter = $state('all');

  onMount(loadUsers);

  async function loadUsers() {
    loading = true;
    try {
      users = await listUsers();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      loading = false;
    }
  }

  let filteredUsers = $derived(
    roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter),
  );

  async function handleInvite() {
    if (!inviteEmail || !invitePassword) {
      errorStore.set('email and password are required');
      return;
    }
    if (invitePassword.length < 8) {
      errorStore.set('Password must be at least 8 characters');
      return;
    }
    inviting = true;
    try {
      await inviteUser({
        email: inviteEmail,
        display_name: inviteDisplayName || null,
        password: invitePassword,
        role: inviteRole,
      });
      showInvite = false;
      inviteEmail = '';
      inviteDisplayName = '';
      invitePassword = '';
      inviteRole = 'viewer';
      await loadUsers();
    } catch (e) {
      errorStore.set(e.message);
    } finally {
      inviting = false;
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
      showPwForm = false;
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
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{i18n.t('nav.users')}</h1>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">User administration (admin only).</p>
    </div>
    <div class="flex gap-2">
      <button class="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm" onclick={loadUsers}>Refresh</button>
      <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onclick={() => (showPwForm = !showPwForm)}>
        {showPwForm ? 'Close' : 'Change My Password'}
      </button>
      <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onclick={() => (showInvite = !showInvite)}>
        {showInvite ? 'Close' : '+ Invite User'}
      </button>
    </div>
  </div>

  {#if showPwForm}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Change my password</h2>
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

  {#if showInvite}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Invite new user</h2>
      <div class="grid grid-cols-2 gap-2">
        <div class="form-field">
          <label class="field-label" for="u-email">Email *</label>
          <input id="u-email" type="email" class="field-input" bind:value={inviteEmail} />
        </div>
        <div class="form-field">
          <label class="field-label" for="u-name">Display name</label>
          <input id="u-name" type="text" class="field-input" bind:value={inviteDisplayName} />
        </div>
        <div class="form-field">
          <label class="field-label" for="u-pw">Password * (min 8 chars)</label>
          <input id="u-pw" type="password" class="field-input" bind:value={invitePassword} minlength="8" />
        </div>
        <div class="form-field">
          <label class="field-label" for="u-role">Role</label>
          <select id="u-role" class="field-input" bind:value={inviteRole}>
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end">
        <button class="btn-primary" onclick={handleInvite} disabled={inviting}>
          {inviting ? '…' : 'Send invite'}
        </button>
      </div>
    </div>
  {/if}

  <div class="flex items-center gap-2 text-sm">
    <label class="text-xs text-gray-600 dark:text-gray-400" for="u-filter">Filter</label>
    <select id="u-filter" class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700" bind:value={roleFilter}>
      <option value="all">all ({users.length})</option>
      <option value="admin">admin</option>
      <option value="editor">editor</option>
      <option value="viewer">viewer</option>
    </select>
  </div>

  {#if loading}
    <p class="text-gray-500 text-sm">{i18n.t('common.loading')}</p>
  {:else if filteredUsers.length === 0}
    <p class="text-gray-500 text-sm">{i18n.t('common.noData')}</p>
  {:else}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-4 py-2">Email</th>
            <th class="px-4 py-2">Name</th>
            <th class="px-4 py-2">Role</th>
            <th class="px-4 py-2">Created</th>
            <th class="px-4 py-2">Last login</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredUsers as u (u.user_id || u.id || u.email)}
            <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td class="px-4 py-2 font-mono text-xs">{u.email}</td>
              <td class="px-4 py-2">{u.display_name || '—'}</td>
              <td class="px-4 py-2">
                <span class="text-xs px-2 py-0.5 rounded-full {roleBadge(u.role)}">{u.role}</span>
              </td>
              <td class="px-4 py-2 text-xs text-gray-500">{u.created_at?.slice(0, 10) || '—'}</td>
              <td class="px-4 py-2 text-xs text-gray-500">{u.last_login_at?.slice(0, 16) || '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
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
</style>

/**
 * Admin / System Management — API client functions.
 *
 * Follows the same request() pattern as lib/blueprint/api.js etc.
 * Covers Tenants, Users, Server Health, System Management, BYOK, Profile.
 */

import { request } from '../api.js';

// ─── Tenants ────────────────────────────────────────────────────────

/**
 * List all tenants (admin only).
 * @returns {Promise<Array>}
 */
export function listTenants() {
  return request('/api/v1/tenants/');
}

/**
 * Create a new tenant.
 * @param {{ name: string, plan?: string, settings?: object }} body
 * @returns {Promise<Object>}
 */
export function createTenant({ name, plan = 'free', settings = {} }) {
  return request('/api/v1/tenants/', {
    method: 'POST',
    body: JSON.stringify({ name, plan, settings }),
  });
}

/**
 * Get the current tenant (the one the user is operating in).
 * @returns {Promise<Object>}
 */
export function getCurrentTenant() {
  return request('/api/v1/tenants/current');
}

/**
 * Update settings of the current tenant.
 * @param {Object} settings
 * @returns {Promise<Object>}
 */
export function updateCurrentTenantSettings(settings) {
  return request('/api/v1/tenants/current/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

/**
 * Update any tenant by ID (admin only).
 * @param {string} tenantId
 * @param {{ name?: string, plan?: string, max_projects?: number, max_concurrent_debates?: number, max_documents?: number, max_storage_mb?: number, settings?: object, is_active?: boolean }} body
 * @returns {Promise<Object>}
 */
export function updateTenant(tenantId, body) {
  return request(`/api/v1/tenants/${encodeURIComponent(tenantId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Delete a tenant by ID (admin only, cannot delete own tenant).
 * @param {string} tenantId
 * @returns {Promise<Object>}
 */
export function deleteTenant(tenantId) {
  return request(`/api/v1/tenants/${encodeURIComponent(tenantId)}`, {
    method: 'DELETE',
  });
}

/**
 * List members of the current tenant.
 * @returns {Promise<Array>}
 */
export function listCurrentTenantUsers() {
  return request('/api/v1/tenants/current/users');
}

/**
 * Invite a user to the current tenant.
 * @param {{ email: string, display_name?: string, password: string, role?: string }} body
 * @returns {Promise<Object>}
 */
export function inviteToCurrentTenant({ email, display_name = null, password, role = 'viewer' }) {
  return request('/api/v1/tenants/current/invite', {
    method: 'POST',
    body: JSON.stringify({ email, display_name, password, role }),
  });
}

/**
 * Remove a user from the current tenant.
 * @param {string} userId
 * @returns {Promise<void>}
 */
export function removeFromCurrentTenant(userId) {
  return request(`/api/v1/tenants/current/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

// ─── Users (auth) ───────────────────────────────────────────────────

/**
 * List all users (admin only).
 * @returns {Promise<Array>}
 */
export function listUsers() {
  return request('/api/v1/auth/users');
}

/**
 * Invite/register a new user globally.
 * @param {{ email: string, display_name?: string, password: string, role?: string }} body
 * @returns {Promise<Object>}
 */
export function inviteUser({ email, display_name = null, password, role = 'viewer' }) {
  return request('/api/v1/auth/users/invite', {
    method: 'POST',
    body: JSON.stringify({ email, display_name, password, role }),
  });
}

/**
 * Get the currently authenticated user.
 * @returns {Promise<Object>}
 */
export function getMe() {
  return request('/api/v1/auth/me');
}

/**
 * Update the currently authenticated user's profile.
 * @param {Object} body
 * @returns {Promise<Object>}
 */
export function updateMe(body) {
  return request('/api/v1/auth/me', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Change the current user's password.
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<Object>}
 */
export function changePassword(currentPassword, newPassword) {
  return request('/api/v1/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

// ─── Server Health & Monitor ───────────────────────────────────────

/**
 * Liveness/readiness probe (no auth required, at /health).
 * @returns {Promise<Object>}
 */
export function getHealth() {
  return request('/health');
}

/**
 * Recent LLM activity (for the monitor).
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<Array>}
 */
export function getMonitorActivity({ limit = 50 } = {}) {
  return request(`/api/v1/monitor/activity?limit=${limit}`);
}

// ─── System Management ─────────────────────────────────────────────

/**
 * Reload LLM profiles (force the in-memory cache to refresh).
 * @returns {Promise<Object>}
 */
export function reloadProfiles() {
  return request('/api/v1/system/reload-profiles', { method: 'POST' });
}

/**
 * Tail recent server logs.
 * @param {{ lines?: number, level?: string }} [opts]
 * @returns {Promise<Object>}
 */
export function getServerLogs({ lines = 200, level = null } = {}) {
  const params = new URLSearchParams({ lines: String(lines) });
  if (level) params.set('level', level);
  return request(`/api/v1/system/logs?${params.toString()}`);
}

// ─── BYOK (Bring Your Own Key) — User API keys ─────────────────────

/**
 * List the current user's saved API keys (BYOK profiles).
 * @returns {Promise<Array>}
 */
export function listUserKeys() {
  return request('/api/v1/user-keys');
}

/**
 * Save / update a user API key.
 * @param {Object} key
 * @returns {Promise<Object>}
 */
export function setUserKey(key) {
  return request('/api/v1/user-keys', {
    method: 'PUT',
    body: JSON.stringify(key),
  });
}

/**
 * Delete a single user API key by LLM profile id.
 * @param {string} profileId
 * @returns {Promise<void>}
 */
export function deleteUserKey(profileId) {
  return request(`/api/v1/user-keys/${encodeURIComponent(profileId)}`, {
    method: 'DELETE',
  });
}

/**
 * Delete all user API keys.
 * @returns {Promise<void>}
 */
export function deleteAllUserKeys() {
  return request('/api/v1/user-keys', { method: 'DELETE' });
}

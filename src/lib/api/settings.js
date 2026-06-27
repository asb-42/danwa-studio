/**
 * Settings, config, health, and system API functions.
 */

import { request } from './core.js';

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export function getHealth() {
  return request('/health');
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export function getVersion() {
  return request('/api/v1/config/version');
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function getSettings() {
  return request('/api/v1/config/settings');
}

export function updateSettings(settings) {
  return request('/api/v1/config/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

export function getLanguage() {
  return request('/api/v1/config/language');
}

export function setLanguage(language) {
  return request('/api/v1/config/language', {
    method: 'PUT',
    body: JSON.stringify({ language }),
  });
}

// ---------------------------------------------------------------------------
// Utility / Service LLM
// ---------------------------------------------------------------------------

export function getServiceLLMConfig() {
  return request('/api/v1/config/service-llm');
}

export function setServiceLLM(profileId) {
  return request('/api/v1/config/service-llm', {
    method: 'POST',
    body: JSON.stringify({ profile_id: profileId }),
  });
}

export function getServiceEligibleProfiles() {
  return request('/api/v1/profiles/llm/service-eligible');
}

// ---------------------------------------------------------------------------
// System Logs
// ---------------------------------------------------------------------------

export function getBackendLogs(lines = 100, search = null) {
  let url = `/api/v1/system/logs?lines=${lines}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  return request(url);
}

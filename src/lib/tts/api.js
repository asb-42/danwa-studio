// TTS API functions for adapter-based TTS engine management

import { request } from '../api.js';

/**
 * List all available TTS engines (adapters)
 * @returns {Promise<Array<{id: string, name: string, license_type: string, supports_style_hints: boolean}>>}
 */
export async function listTTSEngines() {
  return request('/api/tts-engines');
}

/**
 * List available voices for a TTS engine
 * @param {string} engine - Engine ID (e.g., 'edge_tts', 'mimo_tts')
 * @returns {Promise<Array<{id: string, name: string, language: string, gender: string, preview_url?: string}>>}
 */
export async function listTTSVoices(engine) {
  const params = engine ? `?engine=${encodeURIComponent(engine)}` : '';
  return request(`/api/tts-voices${params}`);
}

/**
 * Get TTS plugin configuration
 * @returns {Promise<{engine: string, voice: string, enabled: boolean}>}
 */
export async function getTTSConfig() {
  return request('/api/tts/config');
}

/**
 * Update TTS plugin configuration
 * @param {object} config
 * @param {string} config.engine - Engine ID
 * @param {string} config.voice - Voice ID
 * @param {boolean} config.enabled - Whether TTS is enabled
 */
export async function updateTTSConfig(config) {
  return request('/api/tts/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

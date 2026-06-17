// Vitest setup — global polyfills + module mocks for Svelte 5 + jsdom.

// crypto.randomUUID polyfill (jsdom provides it on modern Node, but make sure)
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = await import('node:crypto').then((m) => m.webcrypto);
}
if (typeof globalThis.crypto.randomUUID !== 'function') {
  globalThis.crypto.randomUUID = () => 'uuid-' + Math.random().toString(36).slice(2);
}

// Mock the @danwa/api-client package (workspace package, may not be installed
// in CI).  Re-exported through src/lib/api.js as `api`.
import { vi } from 'vitest';
vi.mock('@danwa/api-client', () => ({
  api: { __mockApiClient: true },
}));

beforeEach(() => {
  try {
    globalThis.localStorage.clear();
  } catch {
    /* ignore */
  }
});

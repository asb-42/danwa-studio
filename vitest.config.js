/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    alias: {
      $lib: r('./src/lib'),
      '@': r('./src'),
      // Stub the workspace packages so the test runner doesn't try to resolve
      // their on-disk entry points (which may not exist in CI).
      '@danwa/api-client': r('./tests/_stubs/api-client.js'),
      '@danwa/ui-core': r('./tests/_stubs/ui-core.js'),
      '@danwa/i18n': r('./tests/_stubs/i18n.js'),
      // Stub the missing elk-service so layout.js can be loaded.
      // Tests mock it via vi.mock for finer control; this is the fallback.
      // (path resolution: src/lib/blueprint/layout.js -> ../elk-service.js -> src/lib/elk-service.js)
      // Vite resolves the file path; we provide a sibling stub.
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://localhost:5174/' },
    },
    include: ['tests/**/*.test.js', 'tests/**/*.test.svelte.js'],
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: [
        'src/lib/blueprint/registry.js',
        'src/lib/blueprint/validation.js',
        'src/lib/blueprint/dnd.js',
        'src/lib/blueprint/edgeWiring.js',
        'src/lib/blueprint/layout.js',
        'src/lib/blueprint/api.js',
        'src/lib/api.js',
        'src/lib/catalog/api.js',
        'src/lib/i18n/loader.js',
        'src/stores.js',
      ],
      exclude: ['**/node_modules/**', '**/*.svelte'],
    },
  },
});

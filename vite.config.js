import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig(({ mode }) => ({
  plugins: [
    svelte(
      mode === 'development'
        ? {
            compilerOptions: { css: 'injected' },
          }
        : undefined,
    ),
  ],
  server: {
    host: '0.0.0.0',
    port: 5174,
    proxy: {
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/a2a': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/.well-known': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}));
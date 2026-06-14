import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path for GitHub Pages: served from /agent-harness-generator/.
// Override with VITE_BASE=/ for local root-serving or custom domains.
const base = process.env.VITE_BASE ?? '/agent-harness-generator/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

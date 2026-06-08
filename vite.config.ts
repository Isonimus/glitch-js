/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures assets load correctly on subdirectories like GitHub Pages
  build: {
    outDir: 'dist',
    emptyOutDir: false
  },
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/glitch.ts']
    }
  }
});

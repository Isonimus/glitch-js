import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist/lib',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/glitch.ts'),
      name: 'Glitch',
      fileName: (format) => `glitch.${format === 'es' ? 'es' : 'umd'}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true
    })
  ]
});

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
      // The declaration build follows the published entry point only. The
      // tsconfig program spans all of `src`, so without this the test suite
      // and the playground emit declarations of their own into the package.
      include: ['src/glitch.ts'],
      insertTypesEntry: true,
      rollupTypes: true
    })
  ]
});

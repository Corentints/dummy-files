import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node16',
  outDir: 'dist',
  shims: true,
  splitting: false,
  clean: true,
  dts: false,
  minify: false,
  sourcemap: true,
});

import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'ThreatflowUIExtensions',
      fileName: (format) => `threatflow-ui-extensions.${format}.js`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: [],
    },
    outDir: 'dist',
    sourcemap: true,
  },
  publicDir: 'public',
})


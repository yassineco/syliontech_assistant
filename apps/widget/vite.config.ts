import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: 'src/assistant.ts',
      name: 'SylionTechAssistant',
      fileName: 'assistant',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        // Assure que le script peut s'auto-exécuter
        format: 'iife',
        inlineDynamicImports: true
      }
    },
    minify: 'terser',
    sourcemap: false
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
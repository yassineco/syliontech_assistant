import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      
      output: {
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name;
          if (name === 'popup') return 'popup.js';
          if (name === 'background') return 'background.js';
          if (name === 'content') return 'content.js';
          return '[name].js';
        },
        
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (name.endsWith('.css')) {
            if (name.includes('popup')) return 'popup.css';
            if (name.includes('content')) return 'content.css';
            return 'assets/[name]';
          }
          return 'assets/[name]';
        },
      },
    },
    
    // Optimisations pour extension Chrome
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Taille des chunks pour Chrome
    chunkSizeWarningLimit: 1000,
  },
  
  // Configuration pour le développement
  server: {
    port: 5173,
    strictPort: true,
  },
  
  // Variables d'environnement
  define: {
    __DEV__: process.env.NODE_ENV === 'development',
  },
});
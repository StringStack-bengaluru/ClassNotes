import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { bookChaptersPlugin } from './scripts/vite-plugin-book-chapters';

// Local: http://localhost:5173/
// GitHub Pages: set VITE_BASE=/TextBook/ in CI
export default defineConfig({
  base: process.env.VITE_BASE || '/',

  plugins: [react(), tailwindcss(), bookChaptersPlugin()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
});

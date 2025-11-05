import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    open: false,  // Don't auto-open browser in container
    // Serve existing HTML files directly without bundling
    fs: {
      strict: false
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,  // Enable source maps for debugging
    // Build will be configured during migration phase
    // For now, skip building to avoid breaking existing code
    emptyOutDir: false
  }
})

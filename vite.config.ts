import { defineConfig } from 'vite';

export default defineConfig({
  // ✅ CRITICAL for Tauri - makes all asset paths relative
  base: './',

  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },

  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress known noisy warnings
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        // ✅ Forward all other warnings so real issues aren't silently swallowed
        warn(warning);
      }
    },
    sourcemap: false,
    // ✅ Disabled for debugging - turn back to 'esbuild' after fix
    minify: false,
    target: 'esnext',
    // ✅ Forces all CSS into one file - prevents style ordering issues
    cssCodeSplit: false,
    // ✅ Your app is large, raise the warning limit
    chunkSizeWarningLimit: 5000,
    // ✅ Ensure assets use relative paths
    assetsDir: 'assets',
  },

  server: {
    port: 1420,
    strictPort: true
  },

  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],

  resolve: {
    alias: {
      '@': '/src'
    }
  }
});

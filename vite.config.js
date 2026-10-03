import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths so the build works from any sub-folder (GitHub Pages, Capacitor)
  server: { host: true },
  build: { chunkSizeWarningLimit: 800 },
});

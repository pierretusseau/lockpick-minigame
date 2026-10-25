import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative paths: the site works both at the root and under /lockpick-minigame/ (GitHub Pages).
  base: './',
  build: {
    // MUI makes a ~170 kB gzipped bundle: fine for a small game.
    chunkSizeWarningLimit: 700,
    // Two pages: the game (and player links) at the root, the GM mode under /mj/.
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        gm: resolve(import.meta.dirname, 'mj/index.html'),
      },
    },
  },
})

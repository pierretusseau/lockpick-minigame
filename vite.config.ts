import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative paths: the site works both at the root and under /lockpick-minigame/ (GitHub Pages).
  base: './',
  // MUI makes a ~170 kB gzipped bundle: fine for a single-page game.
  build: { chunkSizeWarningLimit: 700 },
})

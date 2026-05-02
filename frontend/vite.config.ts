import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true, // No need to import describe/it/expect/vi
    include: ['src/**/__tests__/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts']
  }
})

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    coverage: {
      provider: 'v8',
      include: [
        'src/components/OfficerLogin.jsx',
        'src/components/VerificationQueue.jsx',
      ],
      thresholds: {
        statements: 80,
        branches: 78,
        functions: 80,
      },
    },
  },
})


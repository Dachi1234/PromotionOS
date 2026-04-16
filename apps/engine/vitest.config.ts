import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10_000,
  },
})

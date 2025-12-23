import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Test environment
    environment: 'happy-dom',

    // Environment matching (optimization)
    environmentMatchGlobs: [
      // Pure utility tests run in Node (faster)
      ['tests/**/date-utils.test.js', 'node'],
      ['tests/**/geojson-utils.test.js', 'node'],
      // API tests run in Node (no DOM needed)
      ['tests/**/api/*.test.ts', 'node'],
    ],

    // Test file patterns (tests live in separate tests/ directory)
    include: [
      'tests/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.claude',
      'src/tmp'
    ],

    // Global test utilities
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}',
        'dist/',
        'src/types/api.ts',
        'src/tmp/',
      ],
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },

    // Timeout for async tests
    testTimeout: 10000,

    // Watch mode configuration
    watch: false,

    // Reporter configuration
    reporters: ['default'],

    // Setup files
    setupFiles: ['./tests/setup.ts'],

    // Mock reset behavior
    mockReset: true,
    restoreMocks: true,
  },

  // Path aliases (must match tsconfig.json and vite.config.ts)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})

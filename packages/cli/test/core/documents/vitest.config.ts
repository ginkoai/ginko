/**
 * @fileType: config
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, vitest, configuration]
 * @related: [*.test.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [vitest]
 */

import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 10000,
    include: [
      '**/*.test.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**'
    ],
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/core/documents/**/*.ts'
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/node_modules/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../../src')
    }
  }
});
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import { TEST_URL } from './src/test/test-db'

const srcAlias = { '@': path.resolve(__dirname, 'src') }

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            ...srcAlias,
            'server-only': path.resolve(__dirname, 'src/test/server-only-stub.ts'),
          },
        },
        test: {
          name: 'unit',
          exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'],
        },
      },
      {
        resolve: {
          alias: {
            ...srcAlias,
            'server-only': path.resolve(__dirname, 'src/test/server-only-stub.ts'),
          },
        },
        test: {
          name: 'integration',
          include: ['src/**/*.integration.test.ts'],
          testTimeout: 15000,
          pool: 'forks',
          fileParallelism: false,
          globalSetup: ['./src/test/integration-setup.ts'],
          env: {
            DATABASE_URL: TEST_URL,
            DB_SCHEMA: 'app',
          },
        },
      },
    ],
  },
})

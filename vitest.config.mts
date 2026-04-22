import path from 'node:path'
import { defineConfig } from 'vitest/config'

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
          env: {
            DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
            DB_SCHEMA: 'app',
          },
        },
      },
    ],
  },
})

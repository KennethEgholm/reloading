// Separate Vitest config for end-to-end verification scripts that need a real
// database. Intentionally NOT included by the default `pnpm test` / CI suite
// (which globs only `lib|app/**` and uses a dummy DATABASE_URL). Run explicitly:
//
//   DATABASE_URL=postgresql://reloading:reloading@localhost:5432/reloading \
//     pnpm vitest run --config vitest.verify.config.ts
//
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['scripts/**/*.e2e.test.ts'],
    // Keep console output focused on the assertions, not Prisma query logging.
    silent: true,
  },
})
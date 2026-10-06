/**
 * Business e2e suite (#498): HTTP tests against a LOCAL API on a LOCAL seeded database.
 * Run: E2E_API_URL=http://localhost:3190 yarn test:e2e   (from tests/), or scripts/e2e/business-e2e.sh.
 * Without E2E_API_URL every describe is skipped. The default `yarn test` ignores this folder.
 */
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/business/**/*.e2e.test.js'],
  globalSetup: '<rootDir>/global-setup.js',
  // Logins are single-session and Overview numbers are merchant-wide deltas: one file at a time.
  maxWorkers: 1,
  testTimeout: 60000,
  verbose: true
};

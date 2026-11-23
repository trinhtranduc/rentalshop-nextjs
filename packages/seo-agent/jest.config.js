/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Tests sit outside src/: that folder is a git subtree shared with other projects.
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
};

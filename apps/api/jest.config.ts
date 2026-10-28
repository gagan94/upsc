import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  // PGlite suites are memory/CPU heavy: cap parallelism at 2 workers.
  // A shared TEST_DATABASE_URL database is reset per createTestDb(); parallel workers would race, so use 1.
  maxWorkers: process.env.TEST_DATABASE_URL ? 1 : 2,
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.ts$': 'ts-jest' },
};

export default config;

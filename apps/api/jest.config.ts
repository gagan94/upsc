import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  // A shared TEST_DATABASE_URL database is reset per createTestDb(); parallel workers would race.
  ...(process.env.TEST_DATABASE_URL ? { maxWorkers: 1 } : {}),
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.ts$': 'ts-jest' },
};

export default config;

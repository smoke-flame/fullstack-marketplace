require('dotenv').config();

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  globalSetup: '<rootDir>/test/e2e/jest/global-setup.js',
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@marketplace/contracts/(.*)$': '<rootDir>/../../apps/contracts/src/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json'
    }
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.dto.ts', '!src/**/*.entity.ts'],
  coverageDirectory: 'coverage',
  verbose: true,
};

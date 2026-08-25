require('dotenv').config();

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@marketplace/contracts/(.*)$': '<rootDir>/../../packages/contracts/src/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.dto.ts', '!src/**/*.entity.ts'],
  coverageDirectory: 'coverage',
  verbose: true,
};

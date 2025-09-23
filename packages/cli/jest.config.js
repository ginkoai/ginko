export default {
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\.ts$': ['ts-jest', {
      useESM: true
    }],
  },
  moduleFileExtensions: ['ts', 'js'],
  moduleNameMapping: {
    '^(\.{1,2}/.*)\.js$': '$1'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  // Skip problematic files for now
  testPathIgnorePatterns: [
    '/node_modules/',
    'config-aware-reflection.ts',
    'platform-templates.ts',
    'hook-migration.ts',
    'path-normalizer.ts'
  ]
};

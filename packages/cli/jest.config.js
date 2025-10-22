export default {
  transform: {
    '^.+\.ts$': 'ts-jest',
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js'],
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(ora|chalk|cli-spinners|strip-ansi|ansi-regex|is-interactive|is-unicode-supported)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  testTimeout: 30000,
};

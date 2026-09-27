/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  transform: {},
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.js',
    'public/js/**/*.js',
    // Pontos de entrada só ligam peças reais (fs, DOM global); e types.js só tem JSDoc.
    '!src/server.js',
    '!public/js/app.js',
    '!public/js/types.js',
  ],
  coverageReporters: ['text-summary', 'text', 'lcov'],
  coverageThreshold: {
    global: { statements: 90, branches: 85, functions: 90, lines: 90 },
  },
};

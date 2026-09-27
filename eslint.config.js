import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'coverage/', '_deploys/', 'data/'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
    rules: {
      'no-console': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'max-depth': ['error', 3],
      'max-params': ['error', 3],
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
    },
  },
  { files: ['src/**', 'scripts/**', '*.js'], languageOptions: { globals: globals.node } },
  { files: ['public/**'], languageOptions: { globals: globals.browser } },
  {
    files: ['tests/**'],
    languageOptions: { globals: { ...globals.node, ...globals.jest, ...globals.browser } },
    rules: { 'max-lines': 'off' },
  },
  // CLIs escrevem para o usuário em texto plano (ver AGENTS.md > Logging).
  { files: ['scripts/**'], rules: { 'no-console': 'off' } },
];

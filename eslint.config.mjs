import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'playwright-report/',
      'test-results/',
      'allure-results/',
      'allure-report/',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Node scripts and config files (no `globals` dependency for two names).
    files: ['**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
  {
    files: ['**/*.ts'],
    // Type-aware rules (no-floating-promises, no-misused-promises, await-thenable, no-unsafe-*).
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Page objects and fixtures too: a waitForTimeout or page.pause() there is as bad as in a spec.
    files: ['tests/**/*.ts', 'src/**/*.ts'],
    ...playwright.configs['flat/recommended'],
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              importNames: ['test', 'expect'],
              message: 'Import test and expect from src/fixtures instead.',
            },
          ],
        },
      ],
    },
  },
  prettierConfig,
);

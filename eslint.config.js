import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'dist-*/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // DOM invariants (docs/03 §3.6): no HTML string injection, no eval.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Build DOM with createElement/textContent.' },
        { property: 'outerHTML', message: 'Build DOM with createElement/textContent.' },
        { property: 'insertAdjacentHTML', message: 'Build DOM with createElement/textContent.' },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.*'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['tests/**/*.ts', 'scripts/**/*.mjs', '*.config.*'],
    rules: { 'no-restricted-properties': 'off' },
  },
);

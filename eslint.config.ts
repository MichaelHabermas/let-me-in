import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['src/app/**/*.ts', 'src/ui/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'dexie',
              message: 'Import from infra/persistence.ts instead (DIP).',
            },
            {
              name: 'onnxruntime-web',
              message: 'Import from infra/onnx-runtime.ts instead (DIP).',
            },
          ],
        },
      ],
    },
  },
  prettier,
];

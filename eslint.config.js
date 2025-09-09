// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'projects/**'] },

  // TypeScript/Angular
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { project: ['./tsconfig.json'] },
    },
    plugins: { '@angular-eslint': angular },
    rules: {
      // правила по вкусу
    },
  },

  // Spec файлы (тесты) - отдельная конфигурация
  {
    files: ['**/*.spec.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { project: ['./tsconfig.spec.json'] },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jasmine: 'readonly',
        spyOn: 'readonly',
        fail: 'readonly',
        // Браузерные глобальные переменные для тестов
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        alert: 'readonly'
      }
    },
    plugins: { '@angular-eslint': angular },
    rules: {
      // Для тестов можем быть более снисходительными
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    },
  },

  // HTML templates
  {
    files: ['**/*.html'],
    plugins: { '@angular-eslint/template': angularTemplate },
    rules: {
      ...angularTemplate.configs['recommended'].rules,
    },
  },

  // Базовые JS-рекомендации
  js.configs.recommended,
];

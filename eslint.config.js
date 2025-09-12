// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';

export default [
  { 
    ignores: [
      'dist/**', 
      'node_modules/**', 
      'projects/**',
      '.angular/**',
      'coverage/**',
      '*.js',
      '*.mjs',
      'src/polyfills.ts',
      'src/test.ts',
      'src/main.ts',
      'src/environment*.ts',
      'angular.json',
      '**/*.spec.ts',
      '**/*.e2e-spec.ts'
    ] 
  },

  // TypeScript/Angular для TS файлов только
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: config.files || ['**/*.ts', '**/*.tsx']
  })),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { project: ['./tsconfig.json'] },
      globals: {
        // Браузерные глобальные переменные
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        alert: 'readonly',
        prompt: 'readonly',
        confirm: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        Audio: 'readonly',
        history: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        FormData: 'readonly',
        FileReader: 'readonly',
        indexedDB: 'readonly',
        KeyboardEvent: 'readonly',
        requestAnimationFrame: 'readonly',
        regeneratorRuntime: 'readonly',
        process: 'readonly'
      }
    },
    plugins: { '@angular-eslint': angular },
    rules: {
      // Менее строгие правила для продакшена
      '@typescript-eslint/no-explicit-any': 'warn', // предупреждение вместо ошибки
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'none', // не проверяем неиспользуемые параметры функций
          varsIgnorePattern: '^_', // игнорируем переменные начинающиеся с _
          argsIgnorePattern: '^_', // игнорируем параметры начинающиеся с _
          ignoreRestSiblings: true
        }
      ],
      'no-unused-vars': [
        'warn',
        {
          args: 'none', // не проверяем неиспользуемые параметры функций
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ]
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
        alert: 'readonly',
        prompt: 'readonly',
        confirm: 'readonly',
        process: 'readonly'
      }
    },
    plugins: { '@angular-eslint': angular },
    rules: {
      // Для тестов можем быть более снисходительными
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    },
  },

  // E2E тесты (Playwright) - отдельная конфигурация
  {
    files: ['**/*.e2e-spec.ts', 'e2e/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { project: ['./tsconfig.json'] },
      globals: {
        // Playwright globals
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly'
      }
    },
    rules: {
      // Для E2E тестов можем быть более снисходительными
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    },
  },

  // HTML templates
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: angularTemplateParser,
      parserOptions: {
        project: ['./tsconfig.json']
      }
    },
    plugins: { '@angular-eslint/template': angularTemplate },
    rules: {
      // Отключаем строгие правила для HTML шаблонов
      '@angular-eslint/template/no-negated-async': 'off',
      '@angular-eslint/template/eqeqeq': 'off'
    },
  },

  // Базовые JS-рекомендации
  js.configs.recommended,
];

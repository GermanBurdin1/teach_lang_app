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

import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'backups/**', 'migration-output/**', '.agents/**', '.claude/**'] },
  {
    files: ['**/*.{js,jsx,mjs}'],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  },
  {
    files: ['App.jsx', 'main.jsx', 'src/**/*.{js,jsx}'],
    languageOptions: { globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { react, 'react-hooks': hooks },
    settings: { react: { version: '18.2' } },
    rules: {
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['App.jsx'],
    // Optional host-injected configuration; App guards access with typeof.
    languageOptions: { globals: { __firebase_config: 'readonly', __app_id: 'readonly', __initial_auth_token: 'readonly' } },
  },
  {
    files: ['api/**/*.js', 'scripts/**/*.{js,mjs}', 'tests/**/*.js', '*.config.js', 'src/**/*Server.js'],
    languageOptions: { globals: globals.node },
  },
];

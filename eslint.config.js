const globals = require('globals');

module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.node,
        CONFIG: 'readonly',
        XLSX: 'readonly',
        L: 'readonly',
        jspdf: 'readonly'
      }
    },
    rules: {
      'no-undef': 'warn',
      'no-unused-vars': 'off',
      eqeqeq: 'off',
      curly: 'off'
    }
  }
];

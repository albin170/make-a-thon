module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  env: {
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  ignorePatterns: ['dist', 'node_modules', '.next'],
  rules: {
    'no-unused-vars': 'off',
  },
};

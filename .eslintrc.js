module.exports = {
  env: {
    node: true,
  },
  ignorePatterns: ['index.spec.js', '.eslintrc.js'],
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    indent: ['error', 2],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'double'],
    semi: ['error', 'always'],
  },
};

module.exports = {
    env: {
        es2021: true,
        node: true,
    },
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint'],
    rules: {
        'linebreak-style': ['error', 'unix'],
        quotes: ['error', 'single', { avoidEscape: true }],
        semi: 'off',
        // '@typescript-eslint/no-non-null-assertion': 'off',
        'no-var': 'error',
        'default-case-last': 'error',
        camelcase: 'error',
        // '@typescript-eslint/no-var-requires': 'off',
    },
};

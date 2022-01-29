module.exports = {
    env: {
        es2021: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
    ],
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
        'no-var': 'error',
        'default-case-last': 'error',
        camelcase: 'error',
        // '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/explicit-member-accessibility': [
            'error',
            { accessibility: 'explicit' },
        ],
        '@typescript-eslint/explicit-module-boundary-types': ['error'],
        '@typescript-eslint/no-inferrable-types': [
            'error',
            { ignoreParameters: true },
        ],
        'max-len': [
            'error',
            { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true },
        ],
    },
};

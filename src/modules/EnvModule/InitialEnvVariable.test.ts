import { describe, expect, test } from 'bun:test';
import { InitialEnvVariable } from './InitialEnvVariable';

describe(InitialEnvVariable.name, () => {
    describe(InitialEnvVariable.prototype.isRequired.name, () => {
        test('throws if missing', () => {
            try {
                new InitialEnvVariable('MISSING_ENV_VAR').isRequired();

                throw new Error('Did not throw');
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                expect(error.message).toInclude('missing');
            }
        });

        test('throws if empty', () => {
            process.env['TEST_ENV_VAR'] = '';

            try {
                new InitialEnvVariable('TEST_ENV_VAR').isRequired();

                throw new Error('Did not throw');
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                expect(error.message).toInclude('empty');
            }
        });

        test('resolves if present and non-empty', () => {
            const text = '  some value  ';

            process.env['TEST_ENV_VAR'] = text;

            const result = new InitialEnvVariable('TEST_ENV_VAR').isRequired();

            expect(result.value).toBe(text.trim());
        });
    });

    describe(InitialEnvVariable.prototype.hasDefaultValueOf.name, () => {
        test('uses default if missing', () => {
            delete process.env['TEST_ENV_VAR'];

            const defaultValue = 'default value';

            const result = new InitialEnvVariable(
                'TEST_ENV_VAR',
            ).hasDefaultValueOf(defaultValue);

            expect(result.value).toBe(defaultValue);
        });

        test('uses existing value if present', () => {
            const text = 'some value 3';

            process.env['TEST_ENV_VAR'] = text;

            const result = new InitialEnvVariable(
                'TEST_ENV_VAR',
            ).hasDefaultValueOf('default value');

            expect(result.value).toBe(text);
        });
    });
});

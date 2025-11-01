import { Color } from '@types';
import { colorize, pluralize } from '@utils';
import { KnownEnvVariable } from './KnownEnvVariable';
import { NumericEnvVariable } from './NumericEnvVariable';

export class StringEnvVariable extends KnownEnvVariable<string> {
    public cannotBe(forbiddenValue: string, errorMessage: string): this {
        if (this.value === forbiddenValue) {
            const thisValue = colorize(forbiddenValue, Color.FgRed);

            throw new Error(
                `${this.named()} cannot be ${thisValue} - ${errorMessage}`,
            );
        }

        return this;
    }

    public minLength(length: number): this {
        if (this.value.length < length) {
            const xCharacters = pluralize(length, 'character');

            throw new Error(
                `${this.named()} cannot be less than ${xCharacters} long`,
            );
        }

        return this;
    }

    public maxLength(length: number): this {
        if (this.value.length > length) {
            const xCharacters = pluralize(length, 'character');

            throw new Error(
                `${this.named()} cannot be more than ${xCharacters} long`,
            );
        }

        return this;
    }

    public mustBeInteger(): NumericEnvVariable {
        const parsed = Number(this.value);

        if (!Number.isInteger(parsed)) {
            throw new Error(`${this.named()} is not a valid integer`);
        }

        return new NumericEnvVariable(this.key, parsed);
    }
}

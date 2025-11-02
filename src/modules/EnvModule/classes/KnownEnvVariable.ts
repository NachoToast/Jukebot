import { Color } from '@types';
import { colorize } from '@utils';
import { BaseEnvVariable } from './BaseEnvVariable';

/**
 * Wrapper class for a value that has been read from `process.env` and definitely exists.
 *
 * These are made after validating an **InitialEnvVariable**.
 */
export class KnownEnvVariable<T> extends BaseEnvVariable {
    public value: T;

    public constructor(key: string, value: T) {
        super(key);
        this.value = value;
    }

    public reliesOn(otherKey: string): this {
        if (!process.env[otherKey]) {
            throw new Error(
                `${this.named()} cannot be set without ${colorize(
                    otherKey,
                    Color.FgRed,
                )} also being present`,
            );
        }

        return this;
    }
}

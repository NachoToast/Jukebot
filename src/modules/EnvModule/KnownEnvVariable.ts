import { BaseEnvVariable } from './BaseEnvVariable';

/**
 * Wrapper class for a value that has been read from `process.env` and
 * definitely exists.
 *
 * These are made after validating an **InitialEnvVariable**.
 */
export abstract class KnownEnvVariable<T> extends BaseEnvVariable {
    public value: T;

    public constructor(key: string, value: T) {
        super(key);
        this.value = value;
    }
}

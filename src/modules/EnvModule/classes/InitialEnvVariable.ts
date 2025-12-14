import process from "node:process";
import { BaseEnvVariable } from "./BaseEnvVariable";
import { StringEnvVariable } from "./StringEnvVariable";

/**
 * Wrapper class for a value that has just been read from `process.env`
 *
 * These get turned into a {@link StringEnvVariable} after being validated.
 */
export class InitialEnvVariable extends BaseEnvVariable {
	private readonly value: string | undefined;

	public constructor(key: string) {
		super(key);
		this.value = process.env[key]?.trim();
	}

	/**
	 * Mark this value as being required.
	 *
	 * This will throw an error if the environment variable is missing or empty.
	 */
	public isRequired(): StringEnvVariable {
		if (this.value === undefined) {
			throw new Error(`${this.named()} is missing`);
		}

		if (this.value.length === 0) {
			throw new Error(`${this.named()} cannot be empty`);
		}

		return new StringEnvVariable(this.key, this.value);
	}

	/**
	 * Mark this value as not being required.
	 *
	 * This will use the provided default value if the environment variable is missing.
	 */
	public hasDefaultValueOf(defaultValue: string): StringEnvVariable {
		if (this.value === undefined) {
			return new StringEnvVariable(this.key, defaultValue);
		}

		if (this.value.length === 0) {
			throw new Error(`${this.named()} cannot be empty`);
		}

		return new StringEnvVariable(this.key, this.value);
	}
}

import process from "node:process";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { BaseEnvVariable } from "./BaseEnvVariable";

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
		if (this.value && !process.env[otherKey]) {
			throw new Error(
				`${this.named()} cannot be set without ${colorize(otherKey, Color.FgRed)} also being present`,
			);
		}

		return this;
	}
}

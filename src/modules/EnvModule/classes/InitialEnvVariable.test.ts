import { describe, expect, test } from "bun:test";
import process from "node:process";
import { InitialEnvVariable } from "./InitialEnvVariable";

describe(InitialEnvVariable.name, () => {
	const envVarKey = "TEST_ENV_VAR";

	describe(InitialEnvVariable.prototype.isRequired.name, () => {
		test("throws if missing", () => {
			try {
				new InitialEnvVariable("MISSING_ENV_VAR").isRequired();

				throw new Error("Did not throw");
			} catch (error) {
				if (!(error instanceof Error)) {
					throw error;
				}

				expect(error.message).toInclude("missing");
			}
		});

		test("throws if empty", () => {
			process.env[envVarKey] = "";

			try {
				new InitialEnvVariable(envVarKey).isRequired();

				throw new Error("Did not throw");
			} catch (error) {
				if (!(error instanceof Error)) {
					throw error;
				}

				expect(error.message).toInclude("empty");
			}
		});

		test("resolves if present and non-empty", () => {
			const text = "  some value  ";

			process.env[envVarKey] = text;

			const result = new InitialEnvVariable(envVarKey).isRequired();

			expect(result.value).toBe(text.trim());
		});
	});

	describe(InitialEnvVariable.prototype.hasDefaultValueOf.name, () => {
		test("uses default if missing", () => {
			delete process.env[envVarKey];

			const defaultValue = "default value";

			const result = new InitialEnvVariable(envVarKey).hasDefaultValueOf(defaultValue);

			expect(result.value).toBe(defaultValue);
		});

		test("uses existing value if present", () => {
			const text = "some value 3";

			process.env[envVarKey] = text;

			const result = new InitialEnvVariable(envVarKey).hasDefaultValueOf("default value");

			expect(result.value).toBe(text);
		});
	});
});

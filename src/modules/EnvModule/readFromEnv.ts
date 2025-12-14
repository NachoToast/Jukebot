import { InitialEnvVariable } from "./classes/InitialEnvVariable";
import type { KnownEnvVariable } from "./classes/KnownEnvVariable";

/** Reads and validates an environment variable. */
export function readFromEnv<T>(
	key: string,
	transformFn: (value: InitialEnvVariable) => KnownEnvVariable<T>,
): T {
	return transformFn(new InitialEnvVariable(key)).value;
}

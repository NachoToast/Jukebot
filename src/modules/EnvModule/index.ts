import { InitialEnvVariable } from './InitialEnvVariable';
import type { KnownEnvVariable } from './KnownEnvVariable';

export function readFromEnv<T>(
    key: string,
    transformFn: (value: InitialEnvVariable) => KnownEnvVariable<T>,
): T {
    return transformFn(new InitialEnvVariable(key)).value;
}

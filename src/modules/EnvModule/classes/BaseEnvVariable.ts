import { Color } from '@types';
import { colorize } from '@utils';

export class BaseEnvVariable {
    protected readonly key: string;

    protected constructor(key: string) {
        this.key = key;
    }

    protected named(): string {
        return `Environment variable ${colorize(this.key, Color.FgRed)}`;
    }
}

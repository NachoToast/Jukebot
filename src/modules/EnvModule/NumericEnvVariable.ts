import { KnownEnvVariable } from './KnownEnvVariable';

export class NumericEnvVariable extends KnownEnvVariable<number> {
    public zeroMeansInfinity(): this {
        if (this.value === 0) {
            this.value = Number.POSITIVE_INFINITY;
        }

        return this;
    }

    public minValue(min: number): this {
        if (this.value < min) {
            throw new Error(
                `${this.named()} cannot be less than ${min.toLocaleString()}`,
            );
        }

        return this;
    }

    public maxValue(max: number): this {
        if (this.value > max) {
            throw new Error(
                `${this.named()} cannot be greater than ${max.toLocaleString()}`,
            );
        }

        return this;
    }
}

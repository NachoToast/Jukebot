import { HopperError } from './HopperError';

export class HopperUnknownError extends HopperError {
    public readonly searchTerm: string;

    public readonly data?: unknown;

    public constructor(searchTerm: string, data?: unknown) {
        super();
        this.searchTerm = searchTerm;
        this.data = data;
    }

    public toString(): string {
        return `Unknown error occurred while searching for "${this.searchTerm}"`;
    }
}

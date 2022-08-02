import { Config } from '../../../../global/Config';
import { HopperError } from './HopperError';

/**
 * Error object thrown when a {@link Hopper} is unable to fetch search results
 * in the {@link Config.timeoutThresholds.fetchResults configured time}.
 */
export class HopperTimeoutError extends HopperError {
    public readonly searchTerm: string;

    public constructor(searchTerm: string) {
        super();
        this.searchTerm = searchTerm;
    }

    public toString(): string {
        return `Unable to fetch results for "${this.searchTerm}" in a reasonable amount of time (${Config.timeoutThresholds.fetchResults})`;
    }
}

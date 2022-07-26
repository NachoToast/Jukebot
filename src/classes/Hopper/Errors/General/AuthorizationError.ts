import { HopperError } from './HopperError';

/**
 * An error in getting results from Spotify track due to not being
 * authorized.
 */
export class HopperAuthorizationError extends HopperError {
    public toString(): string {
        return `Failed to log in to Spotify`;
    }
}

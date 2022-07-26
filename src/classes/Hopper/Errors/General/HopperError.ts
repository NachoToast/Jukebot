/**
 * General object thrown when a Hopper fails to get search results,
 * which will be due to one of the following 3 events (each with their own error object):
 * - A timeout occuring.
 * - An authorization failure.
 * - No results being found.
 * - An unknown error.
 */
export abstract class HopperError {
    /** String to show in an interaction response. */
    public abstract toString(): string;
}

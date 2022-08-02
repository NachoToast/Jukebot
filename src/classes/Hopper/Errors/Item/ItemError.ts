import { MapSearchSourceToFinalTypes, ValidSearchSources } from '../../../../types/Searches';

/**
 * General error object thrown when a search for a single resource fails, or
 * otherwise cannot be completed.
 */
export abstract class HopperItemError<T extends ValidSearchSources> {
    public readonly originalItem: MapSearchSourceToFinalTypes<T>;

    public constructor(item: MapSearchSourceToFinalTypes<T>) {
        this.originalItem = item;
    }

    /** String to show in an interaction response. */
    public abstract toString(): string;
}

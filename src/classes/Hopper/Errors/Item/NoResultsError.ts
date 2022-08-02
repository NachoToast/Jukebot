import { MapSearchSourceToFinalTypes, ValidSearchSources } from '../../../../types/Searches';
import { HopperItemError } from './ItemError';

/**
 * An error in getting results from a Spotify track,
 * due to not finding **any** YouTube results.
 */
export class HopperItemNoResultsError<
    T extends ValidSearchSources.Spotify | ValidSearchSources.Text,
> extends HopperItemError<T> {
    private readonly _name: string;

    public constructor(item: MapSearchSourceToFinalTypes<T>) {
        super(item);
        this._name = typeof item === `string` ? `"${item}"` : `track "${item.name}"`;
    }

    public toString(): string {
        return `No results for ${this._name}`;
    }
}

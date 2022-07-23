import { SearchSources } from '../../../types/SearchTypes';
import { RelevantResource } from '../types';
import { HopperError } from './BaseError';

/**
 * An error in getting results from a Spotify track or text search,
 * due to not finding any YouTube results.
 */
export class NoResultsHopperError<T extends SearchSources.Spotify | SearchSources.Text> extends HopperError<T> {
    public readonly originalItemName: string;

    public constructor(item: RelevantResource<T>, itemName: string) {
        super(item);

        this.originalItemName = itemName;
    }

    public toString(short: boolean): string {
        if (short) {
            return `No results found for \`${this.originalItemName}\``;
        }
        return `Could not find any YouTube results for ${typeof this.originalItem !== `string` ? `track ` : ``}\`${
            this.originalItemName
        }\``;
    }
}

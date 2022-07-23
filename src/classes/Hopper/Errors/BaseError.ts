import { SearchSources } from '../../../types/SearchTypes';
import { RelevantResource } from '../types';

export abstract class HopperError<T extends SearchSources.YouTube | SearchSources.Spotify | SearchSources.Text> {
    public readonly originalItem: RelevantResource<T>;

    public constructor(item: RelevantResource<T>) {
        this.originalItem = item;
    }

    /**
     * @param {boolean} short Whether to show a short string or a full detailed one.
     *
     * Strings should not end in a full-stop, as per style guidelines.
     *
     * @example Short - `Failed to find results for ${this.originalItem.name}`
     * Long - `Failed to find results for ${this.originalItem.name} due to an unexpected server error (500) from https://example.com`
     */
    public abstract toString(short: boolean): string;
}

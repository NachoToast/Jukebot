import { YouTubeVideo } from 'play-dl';
import { Config } from '../../../global/Config';
import { SearchSources } from '../../../types/SearchTypes';
import { RelevantResource } from '../types';
import { HopperError } from './BaseError';

/**
 * An error in getting results from a Spotify track or text search,
 * due to not finding any close enough YouTube results.
 */
export class ConversionHopperError<T extends SearchSources.Spotify | SearchSources.Text> extends HopperError<T> {
    public readonly levenshtein: number;
    public readonly foundItem: YouTubeVideo;
    public readonly originalItemName: string;

    public constructor(item: RelevantResource<T>, levenshtein: number, foundItem: YouTubeVideo, itemName: string) {
        super(item);
        this.levenshtein = levenshtein;
        this.foundItem = foundItem;
        this.originalItemName = itemName;
    }

    public toString(short: boolean): string {
        if (short) {
            return `No good results found for \`${this.originalItemName}\``;
        }
        return `\`${this.originalItemName}\` had no good YouTube equivalent, closest was \`${
            this.foundItem.title ?? `Unknown Video`
        }\` with a similarity of ${this.levenshtein.toFixed(2)} (< ${Config.levenshteinThreshold}).`;
    }
}

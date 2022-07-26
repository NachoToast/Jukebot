import { YouTubeVideo } from 'play-dl';
import { Config } from '../../../../global/Config';
import { MapSearchSourceToFinalTypes, ValidSearchSources } from '../../../../types/Searches';
import { HopperItemError } from './ItemError';

/**
 * An error in getting results from a Spotify track or text search,
 * due to not finding any close enough YouTube results.
 */
export class HopperItemConversionError<
    T extends ValidSearchSources.Spotify | ValidSearchSources.Text,
> extends HopperItemError<T> {
    /**
     * The levenshtein distance between the original search string / track title,
     * and the best YouTube equivalent's title.
     */
    public readonly levenshtein: number;

    /** The best YouTube video equivalent. */
    public readonly foundItem: YouTubeVideo;

    /** Original search string or track title. */
    public readonly originalItemName: string;

    /**
     * @param {RelevantResource<T>} item The Spotify track or plaintext search associated with this error.
     * @param {number} levenshtein The levenshtein distance between the 2 titles.
     * @param {YouTubeVideo} foundItem The "best" result found by the search.
     */
    public constructor(item: MapSearchSourceToFinalTypes<T>, levenshtein: number, foundItem: YouTubeVideo) {
        super(item);
        this.levenshtein = levenshtein;
        this.foundItem = foundItem;
        this.originalItemName = typeof item === `string` ? item : item.name;
    }

    public toString(): string {
        return `\`${this.originalItemName}\` had no good YouTube equivalent, closest was \`${
            this.foundItem.title ?? `Unknown Video`
        }\` with a similarity of ${this.levenshtein.toFixed(2)} (< ${Config.levenshteinThreshold}).`;
    }
}

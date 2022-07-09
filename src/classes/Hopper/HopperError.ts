import { SpotifyTrack, YouTubeVideo } from 'play-dl';
import { Config } from '../../Config';
import { SearchSources } from '../../types/SearchTypes';

export enum BrokenReasons {
    Private,
    Upcoming,
    Live,
    NotAVideo,
    Other,
}

type RelevantResource<T extends SearchSources.YouTube | SearchSources.Spotify | SearchSources.Text> =
    T extends SearchSources.YouTube ? YouTubeVideo : T extends SearchSources.Spotify ? SpotifyTrack : string;

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
     * @example Short - `Failed to find results for ${originalItem.name}`
     * Long - `Failed to find results for ${originalItem.name} due to an unexpected server error (500) from https://example.com`
     */
    public abstract toString(short: boolean): string;
}

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

export class VideoHopperError<T extends BrokenReasons> extends HopperError<SearchSources.YouTube> {
    public readonly reason: BrokenReasons;
    public readonly extra: T extends BrokenReasons.Other ? string : undefined;

    public constructor(item: YouTubeVideo, reason: T, extra: T extends BrokenReasons.Other ? string : undefined) {
        super(item);
        this.reason = reason;
        this.extra = extra;
    }

    public toString(short: boolean): string {
        if (short) {
            return `\`${this.originalItem.title ?? `Unknown Video`}\` is not a valid video`;
        }
        const name = this.originalItem.title ?? `Unknown Video`;
        switch (this.reason) {
            case BrokenReasons.Private:
                return `\`${name}\` is a private video`;
            case BrokenReasons.Upcoming:
                return `\`${name}\` is an upcoming video`;
            case BrokenReasons.Live:
                return `\`${name}\` is a live video`;
            case BrokenReasons.NotAVideo:
                return `\`${name}\` is a ${this.originalItem.type}`;
            case BrokenReasons.Other:
                return `\`${name}\` had unexpected video error: '${this.extra}'`;
            default:
                return `\`${name}\` had unknown video error`;
        }
    }
}

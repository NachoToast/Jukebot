import { YouTubeVideo } from 'play-dl';
import { SearchSources } from '../../../types/SearchTypes';
import { BrokenReasons } from '../types';
import { HopperError } from './BaseError';

/**
 * An error in getting results from a YouTube video,
 * due to any number of {@link BrokenReasons reasons}.
 */
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

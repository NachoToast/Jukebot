import { YouTubeVideo } from 'play-dl';
import { ValidSearchSources } from '../../../../types/Searches';
import { BrokenReasons } from '../../types';
import { HopperItemError } from './ItemError';

/**
 * An error in getting results from a YouTube video,
 * due to any number of {@link BrokenReasons reasons}.
 */
export class HopperItemVideoError<
    T extends BrokenReasons = BrokenReasons,
> extends HopperItemError<ValidSearchSources.YouTube> {
    public readonly reason: BrokenReasons;
    public readonly extra: T extends BrokenReasons.Other ? string : undefined;

    /**
     * @param {YouTubeVideo} item The video associated with this error.
     * @param {T} reason The {@link BrokenReasons reason} this video isn't valid.
     * @param {string|undefined} extra Extra information if the reason is `Unknown`.
     */
    public constructor(item: YouTubeVideo, reason: T, extra: T extends BrokenReasons.Other ? string : undefined) {
        super(item);
        this.reason = reason;
        this.extra = extra;
    }

    public toString(): string {
        const name = this.originalItem.title ?? `Unknown Video`;
        switch (this.reason) {
            case BrokenReasons.Private:
                return `\`${name}\` is a private video`;
            case BrokenReasons.Upcoming:
                return `\`${name}\` is an upcoming video`;
            case BrokenReasons.NotAVideo:
                return `\`${name}\` is a ${this.originalItem.type}, not a video`;
            case BrokenReasons.Other:
                return `\`${name}\` had unexpected video error: '${this.extra}'`;
        }
    }
}

import { Config } from '../../global/Config';
import { MusicDisc } from '.';

/**
 * Error object thrown when a {@link MusicDisc} is unable to prepare it's audio resource in the
 * {@link Config.timeoutThresholds.generateResource configured time}.
 *
 */
export class DiscTimeoutError {
    public readonly disc: MusicDisc;

    public constructor(disc: MusicDisc) {
        this.disc = disc;
    }

    /** String to show in an interaction response. */
    public toString(): string {
        return `Unable to load "${this.disc.title}" (${this.disc.durationString}) in a reasonable amount of time (${Config.timeoutThresholds.generateResource} seconds)`;
    }
}

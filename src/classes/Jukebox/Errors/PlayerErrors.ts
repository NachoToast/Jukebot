import { AudioResource } from '@discordjs/voice';
import { Config } from '../../../global/Config';
import { MusicDisc } from '../../MusicDisc';

export abstract class PlayerError {
    public readonly disc: MusicDisc;

    public constructor(disc: MusicDisc) {
        this.disc = disc;
    }

    /** String to show in an interaction response. */
    public abstract toString(): string;
}

export class PlayerResourceError extends PlayerError {
    public readonly resourceErrorMessage: string;
    public readonly metadata: MusicDisc;

    public constructor(error: unknown, resource: AudioResource<MusicDisc>) {
        super(resource.metadata);

        if (error instanceof Error) {
            this.resourceErrorMessage = error.message.toLowerCase().slice(0, -1);
        } else {
            this.resourceErrorMessage = `unknown resource error`;
        }

        this.metadata = resource.metadata;
    }

    public toString(): string {
        return `Failed to play "${this.metadata.title}" - ${this.resourceErrorMessage}`;
    }
}

export class PlayerTimeoutError extends PlayerError {
    public toString(): string {
        return `Could not start playing "${this.disc.title}" (${this.disc.durationString}) in a reasonable time (${Config.timeoutThresholds.play} seconds)`;
    }
}

export class PlayerUnknownError extends PlayerError {
    // babaji
    public toString(): string {
        return `Unknown error occurred trying to play "${this.disc.title}"`;
    }
}

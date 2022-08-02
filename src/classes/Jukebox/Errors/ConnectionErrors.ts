import { VoiceBasedChannel } from 'discord.js';
import { Config } from '../../../global/Config';

export abstract class ConnectionError {
    public readonly voiceChannel: VoiceBasedChannel;

    public constructor(voiceChannel: VoiceBasedChannel) {
        this.voiceChannel = voiceChannel;
    }

    /** String to show in an interaction response. */
    public abstract toString(): string;
}

export class ConnectionTimeoutError extends ConnectionError {
    public toString(): string {
        return `Could not connect to <#${this.voiceChannel.id}> in a reasonable time (${Config.timeoutThresholds.connect} seconds)`;
    }
}

export class ConnectionUnknownError extends ConnectionError {
    public toString(): string {
        return `Unknown error occurred trying to connect to <#${this.voiceChannel.id}>`;
    }
}

export class ConnectionPermissionError extends ConnectionError {
    public toString(): string {
        return `Missing permissions to join <#${this.voiceChannel.id}>`;
    }
}

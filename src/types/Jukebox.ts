import { AudioPlayerStatus } from '@discordjs/voice';
import { Snowflake } from 'discord-api-types';
import { MusicDisc } from '../classes/MusicDisc';

export interface CurrentlyPlaying {
    active: true;

    musicDisc: MusicDisc;

    /** This should NOT be used to determine when a song started playing,
     * only how long the song has been playing for.
     *
     * This is because the player can be paused. */
    playingSince: number;
}

export interface CurrentlyIdle {
    active: false;

    idleSince: number;
    wasPlaying: {
        musicDisc: MusicDisc;
        for: number;
    } | null;

    leaveTimeout: NodeJS.Timeout;
}

export type CurrentStatus = CurrentlyPlaying | CurrentlyIdle;

export const pausedStates = [AudioPlayerStatus.AutoPaused, AudioPlayerStatus.Paused, AudioPlayerStatus.Idle];

export enum JukeboxStatuses {
    NotConnected,
    ConnectedButNotPlaying,
    Playing,
}

export type DestroyCallback = (guildId: Snowflake) => boolean;

export enum CleanUpReasons {
    Inactivity = 'inactivity',
    ClientRequest = 'client request',

    PlayerError = 'error with the audio player',
    ConnectionError = 'error with the voice connection',
    PlayerTimeout = 'being unable to play audio in time',
    ConnectionTimeout = 'being unable to connect in time',
}

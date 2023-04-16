import { MusicDisc } from '../classes';

export interface JukeboxStateActive {
    status: 'active';
    currentlyPlaying: MusicDisc;
    playingSince: number;
}

export interface JukeboxStateIdle {
    status: 'idle';
    setAt: number;
    /** Can be undefined if configured inactivity timeout value is 0. */
    timeout?: NodeJS.Timeout;

    wasPlaying?: {
        item: MusicDisc;
        /** How long this item was playing for, in milliseconds. */
        for: number;
    };
}

export type JukeboxState = JukeboxStateActive | JukeboxStateIdle;

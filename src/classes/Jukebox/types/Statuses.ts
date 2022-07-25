import { AudioPlayer, VoiceConnection } from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';
import { MusicDisc } from '../../MusicDisc';

export enum StatusTiers {
    /** The bot is not in a VC, but a Jukebox instance still exists for the guild. */
    Inactive,
    /** The bot is in VC but not playing anything. */
    Idle,
    /** The bot is in VC and playing music. */
    Active,
}

interface BaseJukeboxStatus {
    tier: StatusTiers;
    leaveTimeout?: NodeJS.Timeout | null;
}

export interface ActiveJukeboxStatus extends BaseJukeboxStatus {
    tier: StatusTiers.Active;
    playing: MusicDisc;

    /**
     * When the current song started playing.
     *
     * Accounts for pauses in playback, meaning it shouldn't
     * actually be used to determine when the song first started.
     */
    playingSince: number;

    connection: VoiceConnection;
    player: AudioPlayer;
    channel: VoiceBasedChannel;

    leaveTimeout?: undefined;
}

interface BaseIdleJukeboxStatus extends BaseJukeboxStatus {
    tier: StatusTiers.Idle;
    wasPlaying: MusicDisc | null;
    /** Length in MS. */
    for: number | null;
    /** May be null if the configured timeout is 0. */
    leaveTimeout: NodeJS.Timeout | null;

    connection: VoiceConnection;
    player: AudioPlayer;
    channel: VoiceBasedChannel;
}

interface NowIdleJukeboxStatus extends BaseIdleJukeboxStatus {
    wasPlaying: MusicDisc;
    for: number;
}

interface InitiallyIdleJukeboxStatus extends BaseIdleJukeboxStatus {
    wasPlaying: null;
    for: null;
}

export type IdleJukeboxStatus = NowIdleJukeboxStatus | InitiallyIdleJukeboxStatus;

export interface InactiveJukeboxStatus extends BaseJukeboxStatus {
    tier: StatusTiers.Inactive;
    /** May be null if the configured timeout is 0. */
    leaveTimeout: NodeJS.Timeout | null;
}

export type JukeboxStatus = IdleJukeboxStatus | ActiveJukeboxStatus | InactiveJukeboxStatus;

import { MusicDisc } from '../classes/MusicDisc';

export interface CurrentlyPlaying {
    musicDisc: MusicDisc;
    startedAt: number;
}

export enum JukeboxStatuses {
    NotConnected,
    ConnectedButNotPlaying,
    Playing,
}

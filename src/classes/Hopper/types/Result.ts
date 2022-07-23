import { ValidSearch, IsPlaylist } from '../../../types/SearchTypes';
import { MusicDisc } from '../../MusicDisc';
import { HopperError, VideoHopperError } from '../Errors';
import { BrokenReasons } from './BrokenReasons';

interface BaseHopperResult {
    success: boolean;
}

export interface SuccessfulHopperResult<T extends ValidSearch> extends BaseHopperResult {
    success: true;
    items: MusicDisc[];
    errors: (HopperError<T[`source`]> | VideoHopperError<BrokenReasons>)[];
    playlistMetadata: IsPlaylist<T[`type`]> extends true ? PlaylistMetadata : undefined;
}

/** Failed due to unexpected errors, NOT due to no results being found or results being invalid. */
export interface FailedHopperResult extends BaseHopperResult {
    success: false;
    error?: unknown;
}

export type HopperResult<T extends ValidSearch> = SuccessfulHopperResult<T> | FailedHopperResult;

export interface PlaylistMetadata {
    playlistName: string;
    playlistImageURL: string;
    playlistSize: number;
    playlistURL: string;
    createdBy: string;
}

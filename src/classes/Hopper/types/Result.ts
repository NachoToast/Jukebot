import { MapSearchSourceToTypes, SearchPlaylistTypes, ValidSearchSources } from '../../../types/Searches';
import { MusicDisc } from '../../MusicDisc';
import { HopperSingleErrorResponse } from './ErrorResponse';

/** Results returned by a Hopper after a successful fetching of results. */
export interface HopperResult<T extends ValidSearchSources, K extends MapSearchSourceToTypes<T>> {
    /** Items created from search, may be empty (e.g. from an empty Spotify playlist, or an errored single search). */
    items: MusicDisc[];

    /** Errors that occurred while retrieving items.*/
    errors: HopperSingleErrorResponse<T>[];

    /** Metadata of the playlist found, if applicable. */
    playlistMetadata: K extends SearchPlaylistTypes ? PlaylistMetadata : undefined;
}

export interface PlaylistMetadata {
    playlistName: string;
    playlistImageURL: string;
    playlistSize: number;
    playlistURL: string;
    createdBy: string;
}

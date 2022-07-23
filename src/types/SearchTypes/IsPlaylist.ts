import { SpotifySubtypes, YouTubeSubtypes } from './SearchSubtypes';

/** Subtypes that return multiple items. */
export type IsPlaylist<T extends YouTubeSubtypes | SpotifySubtypes | unknown> = T extends
    | YouTubeSubtypes.Playlist
    | SpotifySubtypes.Playlist
    | SpotifySubtypes.Album
    ? true
    : false;

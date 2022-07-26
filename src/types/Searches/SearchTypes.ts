import { SpotifyTrack, YouTubeVideo } from 'play-dl';
import { SearchSources, ValidSearchSources } from './SearchSources';

export enum YouTubeSearchTypes {
    Video = `video`,
    Playlist = `playlist`,
}

export enum SpotifySearchTypes {
    Track = `track`,
    Playlist = `playlist`,
    Album = `album`,
}

export enum TextSearchTypes {
    Text = `string`,
}

/**
 * Gets the allowed search types for a given valid search source.
 * - YouTube sources must have a type of **Video** or **Playlist**.
 * - Spotify sources must be **Track**, **Album**, or **Playlist**.
 * - Text sources must be **Text**.
 */
export type MapSearchSourceToTypes<T extends SearchSources> = T extends ValidSearchSources.YouTube
    ? YouTubeSearchTypes
    : T extends ValidSearchSources.Spotify
    ? SpotifySearchTypes
    : T extends ValidSearchSources.Text
    ? TextSearchTypes.Text
    : never;

export type MapSearchSourceToFinalTypes<T extends SearchSources> = T extends ValidSearchSources.YouTube
    ? YouTubeVideo
    : T extends ValidSearchSources.Spotify
    ? SpotifyTrack
    : T extends ValidSearchSources.Text
    ? string
    : never;

import { SpotifyAlbum, SpotifyPlaylist, SpotifyTrack, YouTubePlayList, YouTubeVideo } from 'play-dl';
import { SpotifySearchTypes, TextSearchTypes, YouTubeSearchTypes } from './SearchTypes';

export type YouTubeSearchReturnValue<T extends YouTubeSearchTypes> = T extends YouTubeSearchTypes.Playlist
    ? YouTubePlayList
    : YouTubeVideo;

export type SpotifySearchReturnValue<T extends SpotifySearchTypes> = T extends SpotifySearchTypes.Playlist
    ? SpotifyPlaylist
    : T extends SpotifySearchTypes.Album
    ? SpotifyAlbum
    : SpotifyTrack;

export type TextSearchReturnValue = string;

/** The type of item returned when a search of this type is queried. */
export type ValidSearchReturnValue<T extends SpotifySearchTypes | YouTubeSearchTypes | TextSearchTypes> =
    T extends SpotifySearchTypes
        ? SpotifySearchReturnValue<T>
        : T extends YouTubeSearchTypes
        ? YouTubeSearchReturnValue<T>
        : T extends TextSearchTypes
        ? TextSearchReturnValue
        : never;

export type SearchPlaylistTypes = SpotifySearchTypes.Album | SpotifySearchTypes.Playlist | YouTubeSearchTypes.Playlist;

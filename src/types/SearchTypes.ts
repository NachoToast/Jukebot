export enum SearchSources {
    /** A YouTube link. */
    YouTube,

    /** A Spotify link. */
    Spotify,

    /** A text search. */
    Text,

    /** An unknown URL. */
    Unknown,

    /** An invalid URL. */
    Invalid,
}

export enum YouTubeSubtypes {
    Video,
    Playlist,
}

export enum SpotifySubtypes {
    Track,
    Playlist,
    Album,
}

export type IsPlaylist<T extends YouTubeSubtypes | SpotifySubtypes | unknown> = T extends YouTubeSubtypes.Playlist
    ? true
    : T extends SpotifySubtypes.Playlist
    ? true
    : T extends SpotifySubtypes.Album
    ? true
    : false;

interface BaseSearchType {
    valid: boolean;
    source: SearchSources;
    type?: YouTubeSubtypes | SpotifySubtypes;
}

interface BaseInvalidSearchType extends BaseSearchType {
    valid: false;
}

interface BaseValidSearchType extends BaseSearchType {
    valid: true;
    source: Exclude<SearchSources, SearchSources.Unknown | SearchSources.Invalid>;
}

// invalid searches
export interface InvalidSpotifySearch extends BaseInvalidSearchType {
    source: SearchSources.Spotify;
    type?: SpotifySubtypes;
}

export interface InvalidYouTubeSearch extends BaseInvalidSearchType {
    source: SearchSources.YouTube;
    type?: YouTubeSubtypes;
}

export interface InvalidTextSearch extends BaseInvalidSearchType {
    source: SearchSources.Text;
}

/** Search had a valid link, but wasn't recognized as a YouTube or Spotify one. */
export interface InvalidUnknownSearch extends BaseInvalidSearchType {
    source: SearchSources.Unknown;
}

/** Search had a bad link. */
export interface InvalidInvalidSearch extends BaseInvalidSearchType {
    source: SearchSources.Invalid;
}

// valid searches
export interface ValidSpotifySearch<T extends SpotifySubtypes = SpotifySubtypes> extends BaseValidSearchType {
    source: SearchSources.Spotify;
    type: T;
}

export interface ValidYouTubeSearch<T extends YouTubeSubtypes = YouTubeSubtypes> extends BaseValidSearchType {
    source: SearchSources.YouTube;
    type: T;
}

export interface ValidTextSearch extends BaseValidSearchType {
    source: SearchSources.Text;
    type?: undefined;
}

export type ValidSearch = ValidSpotifySearch | ValidYouTubeSearch | ValidTextSearch;

export type InvalidSearch =
    | InvalidSpotifySearch
    | InvalidYouTubeSearch
    | InvalidUnknownSearch
    | InvalidTextSearch
    | InvalidInvalidSearch;

export type AnySearch = ValidSearch | InvalidSearch;

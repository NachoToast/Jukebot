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

interface BaseSearchType {
    valid: boolean;
    source: SearchSources;
    type?: YouTubeSubtypes | SpotifySubtypes;
}

interface BaseInvalidSearchType extends BaseSearchType {
    valid: false;
    type?: undefined;
}

interface BaseValidSearchType extends BaseSearchType {
    valid: true;
    source: Exclude<SearchSources, SearchSources.Unknown | SearchSources.Invalid>;
}

// invalid searches
export interface InvalidSpotifySearch extends BaseInvalidSearchType {
    source: SearchSources.Spotify;
    // type?: SpotifySubtypes;
}

export interface InvalidYouTubeSearch extends BaseInvalidSearchType {
    source: SearchSources.YouTube;
    // type?: YouTubeSubtypes;
}

export interface InvalidTextSearch extends BaseInvalidSearchType {
    source: SearchSources.Text;
    // type?: undefined;
}

export interface InvalidUnknownSearch extends BaseInvalidSearchType {
    source: SearchSources.Unknown;
    // type?: undefined;
}

export interface InvalidInvalidSearch extends BaseInvalidSearchType {
    source: SearchSources.Invalid;
    // type?: undefined;
}

// valid searches
export interface ValidSpotifySearch extends BaseValidSearchType {
    source: SearchSources.Spotify;
    type: SpotifySubtypes;
}

export interface ValidYouTubeSearch extends BaseValidSearchType {
    source: SearchSources.YouTube;
    type: YouTubeSubtypes;
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

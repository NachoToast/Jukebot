import { SearchSources } from './SearchSources';
import { SpotifySubtypes, YouTubeSubtypes } from './SearchSubtypes';

interface BaseSearchType {
    /** Whether this search can be successfully queried to retrieve results. */
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

/** A Spotify search with an invalid URL. */
export interface InvalidSpotifySearch extends BaseInvalidSearchType {
    source: SearchSources.Spotify;
    type?: SpotifySubtypes;
}

/** A YouTube search with an invalid URL. */
export interface InvalidYouTubeSearch extends BaseInvalidSearchType {
    source: SearchSources.YouTube;
    type?: YouTubeSubtypes;
}

/** A text search that did not meet some requirements (e.g. minimum length). */
export interface InvalidTextSearch extends BaseInvalidSearchType {
    source: SearchSources.Text;
}

/** A search which had a valid link, but wasn't recognized as a YouTube or Spotify one. */
export interface InvalidUnknownSearch extends BaseInvalidSearchType {
    source: SearchSources.Unknown;
}

/** A search had a bad link, that also couldn't be recognized as a YouTube or Spotify link. */
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

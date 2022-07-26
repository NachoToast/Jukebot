export enum ValidSearchSources {
    /** A YouTube URL, may not be valid. */
    YouTube = `YouTube`,

    /** A Spotify URL, may not be valid. */
    Spotify = `Spotify`,

    /** A text search, may not be valid. */
    Text = `text`,
}

export enum InvalidSearchSources {
    /** An unknown URL. */
    Unknown = `unknown`,

    /** An invalid unknown URL. */
    Invalid = `invalid`,
}

export type SearchSources = ValidSearchSources | InvalidSearchSources;

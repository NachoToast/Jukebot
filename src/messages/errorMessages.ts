import { SpotifyTrack, YouTubeVideo } from 'play-dl';
import { JukebotGlobals } from '../global';
import { Search } from '../types';

export const errorMessages = {
    /** Sent when a Spotify link is provided to the bot, but Spotify integration has not been set up. */
    missingSpotifyData: 'Spotify integration not set up',

    /**
     * Sent when a Spotify link is provided to the bot, and Spotify integration has been set up, but said integration is
     * invalid.
     */
    invalidSpotifyData: 'Spotify integration incorrectly set up (invalid credentials)',

    /**
     * Sent when a Spotify link is provided to the bot, but returns HTTP status code 404 when fetched.
     *
     * This usually indicates that the item is private.
     */
    spotify404: (searchType: Search['type']) =>
        `And how the fuck do you think I can access a private Spotify ${searchType} hmm?`,

    /**
     * Sent when an age-restricted YouTube video is provided to the bot, but YouTube integration has not been set up.
     */
    missingYouTubeData:
        'YouTube age restricted content integration not set up, try queueing a video that is not age restricted instead',

    /** Sent when a Spotify track link is provided but for some reason cannot be fetched. */
    unknownTrackError: (track: SpotifyTrack) => `Unknown error with track <${track.url}>`,

    /** Sent when a YouTube video link is provided but for some reason cannot be fetched. */
    unknownVideoError: (video: YouTubeVideo) => `Unknown error with video <${video.url}>`,

    /** Sent when the number of results returned for a search is 0. */
    noResultsFound: 'No results found',

    /**
     * Sent when the number of results returned for a search is > 0, but none are similar enough to the search query.
     */
    noAcceptableResultsFound: 'No results found',

    /** Sent when a private video is returned from a search. */
    badVideoPrivate: (video: YouTubeVideo) => `Cannot queue a private video (<${video.url}>)`,

    /** Sent when an upcoming video is returned from a search. */
    badVideoUpcoming: (video: YouTubeVideo) => `Cannot queue an upcoming video (<${video.url}>)`,

    /** Sent when a non-video is returned from a search, this shouldn't really happen at all. */
    badVideoType: (video: YouTubeVideo) => `<${video.url}> is not a video`,

    /** Sent when a Spotify session request fails. */
    failedSpotifyRefresh: 'Failed to refresh Spotify session',

    /** Sent when a Spotify session request that was running in the background fails. */
    failedSpotifyRefreshBackground: (error: unknown) =>
        `Failed to refresh Spotify session${error instanceof Error ? `: ${error.message}` : ''}`,

    /** Sent when unable to fetch search results in the configured maximum time. */
    searchTimeout: (searchSource: Search['source'], searchTerm: string) =>
        `Unable to fetch results for ${
            searchSource !== 'text' ? searchTerm : `"${searchTerm}"`
        } in a reasonable amount of time (${JukebotGlobals.config.timeoutThresholds.fetchResults} second${
            JukebotGlobals.config.timeoutThresholds.fetchResults !== 1 ? 's' : ''
        })`,
};

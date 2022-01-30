import { InteractionReplyOptions } from 'discord.js';
import { MusicDisc } from '../classes/MusicDisc';

export interface VideoAddStats {
    /** The position of this song in the queue. */
    queuePosition: number;

    musicDisc: MusicDisc;
}

export interface PlaylistAddStats {
    /** The number of songs added to the queue. */
    numAdded: number;

    /** The number of songs in the playlist. */
    totalSongs: number;

    /** The position of the playlist's first song in the queue. */
    firstPosition: number;

    /** The total duration of the playlist, in seconds. */
    totalDuration: number;
}

export enum YouTubeFailureReasons {
    InvalidURL = 'Please specify a valid YouTube URL',

    NonExistent = "That video doesn't exist",

    Private = 'That video is private',

    Premiere = "That video hasn't been released yet",

    Live = 'Playing live videos is not allowed',

    NoData = 'That video is missing key data, please report this to NachoToast',
}

/** Reasons a hopper gives for failing to add an item to it. */
export enum BaseFailureReasons {
    /** The query string was empty, non-existent, or too short. */
    InvalidQuery = 'Please specify a valid song, playlist, or URL',

    /** The query string was recognized as a Spotify URL, but was invalid. */
    InvalidSpotifyURL = "That doesn't seem to be a valid Spotify URL",

    /** No results could be found after searching using the query string.
     *
     * This is also returned if the results are below the `levenshteinThreshold`
     */
    NoResults = 'No results found',

    QueueTooLarge = 'The queue is full, please try again later',
}

export type FailReason = BaseFailureReasons | YouTubeFailureReasons;

interface FailedResponse {
    failure: true;
    reason: FailReason;
}
interface SuccessfulResponse {
    failure: false;
    output: InteractionReplyOptions;
}

export type AddResponse = FailedResponse | SuccessfulResponse;

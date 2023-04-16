export interface QueueLengthInfo {
    /** Total number of videos in the queue (both live and non-live). */
    totalItems: number;

    /** Cumulative duration (in seconds) of all non-live videos in the queue. */
    totalDuration: number;

    /** Cumulative duration (in seconds) of all videos before the first live one. */
    durationTillFirstLive: number;

    /** Number of live videos in the queue. */
    numLiveVideos: number;
}

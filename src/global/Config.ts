export const Config = {
    /** Maximum number of items allowed in a queue, set to 0 for no limit. */
    maxQueueSize: 1000,

    /** Time (in seconds) between status/activity updates. Setting to 0 disables updates entirely. */
    statusTimePeriod: 2 * 60,

    /**
     * Minimum string similarity of search result and queried search.
     *
     * Results below this number won't be recognized.
     *
     * Used to prevent unintentionally queueing random videos.
     */
    levenshteinThreshold: 0.1,

    /**
     * These values dictate maximum time allowed for certain tasks.
     *
     * Setting to 0 will give unlimited time (unless a different behaviour is specified).
     *
     * Values are all in seconds.
     */
    timeoutThresholds: {
        /** Log into Discord. */
        discordLogin: 5,

        /** Fetch and process search results. */
        fetchResults: 5,

        /** Prepare audio stream. */
        generateResource: 10,

        /** Connect to the VC.*/
        connect: 10,

        /** Start song playback. */
        play: 10,

        /** Leave the VC after this many seconds of inactivity. */
        leaveVoice: 300,

        /** Clear the queue X seconds after leaving the VC. */
        clearQueue: 300,

        /** Stop listening to "Next Page" events after X seconds. */
        stopQueuePagination: 300,
    },
};

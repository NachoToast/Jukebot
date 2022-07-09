export const Config = {
    /** Maximum number of items allowed in a queue, set to 0 for no limit. */
    maxQueueSize: 1000,

    /**
     * Maximum time (in seconds) given to log into Discord.
     *
     * If not logged in after this amount of time, process will exit.
     *
     * Set to 0 for unlimited time.
     */
    maxLoginTime: 5,

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
};

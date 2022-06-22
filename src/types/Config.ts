import { HexColorString } from 'discord.js';

export default interface Config {
    /** What Discord shows the bot is listening to. */
    activityString: string;

    /**
     * Maximum number of items in the queue at any given time.
     *
     * Set to `0` to have no maximum size.
     */
    maxQueueSize: number;

    /** Global volume modifier, with 1 being no modification and 0 muting audio entirely. */
    volumeModifier: number;

    /** The colour that embeds will have. Must be a hexadecimal colour string. */
    colourTheme: HexColorString;

    /**
     * Minimum string similarity of search result and queried search.
     *
     * Results below this number won't be queued.
     *
     * Used to prevent unintentionally queueing random videos.
     *
     * To get an idea of how this works, see the [test files](https://github.com/NachoToast/Jukebot/blob/d1d1a3e75d903aafbd36f6eb6909d5c2e9c24e72/src/helpers/levenshtein.test.ts#L16-L19).
     */
    levenshteinThreshold: number;

    /** Detect and announce new releases on startup. */
    announcementSystem: {
        /**
         * Don't announce releases older than this many minutes.
         *
         * Setting to 0 will always announce the latest release.
         */
        dontAnnounceOlderThan: number;

        enabledInDevelopment: boolean;
        enabledInProduction: boolean;
    };

    /** Maximum time in seconds to perform a certain action. Set to `0` to have no maximum time. */
    timeoutThresholds: {
        /** Connect to a voice channel. */
        connect: number;

        /** Generate audio resource from stream. */
        generateResource: number;

        /** Load initial results from search term or link. */
        getSearchResult: number;

        /** Leave after not playing anything. */
        inactivity: number;

        /** Login to Discord. */
        login: number;

        /** Start playing an audio resource. */
        play: number;

        /** How frequently to update the bot's status. */
        statusUpdate: number;

        /** Stop responding to page changes for queue embeds. Must be at least 3 seconds. */
        stopQueuePagination: number;
    };
}

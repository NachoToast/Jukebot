export interface AppConfig {
    /**
     * Discord Bot API Token.
     *
     * **Never share this!**
     */
    readonly discordToken: string;

    /**
     * Maximum number of songs that can be in the queue.
     *
     * Prevents high memory usage (e.g. if someone queues up a morbillion
     * songs).
     *
     * Must be an integer above 0, may be {@link Number.POSITIVE_INFINITY}.
     *
     * @default 1000
     */
    readonly maxQueueSize: number;

    /**
     * Number of seconds to wait for Discord login to complete before timing
     * out.
     *
     * Mainly useful in deployment environments to prevent hanging.
     *
     * Must be an integer above 0, may be {@link Number.POSITIVE_INFINITY}.
     *
     * @default 30
     */
    readonly discordLoginTimeout: number;
}

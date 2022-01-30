import { HexColorString } from 'discord.js';

export default interface Config {
    /** Link to to the bot's source code. */
    sourceCode: string;

    /** If the bot doesn't connect to Discord after this many seconds, the process will terminate.
     *
     * Set to 0 to never terminate.
     */
    readyTimeout: number;

    /** Minimum string similarity of search result and queried search.
     *
     * Results below this number won't be queued.
     *
     * Used to prevent unintentionally queueing random videos.
     *
     * To get an idea of how this works, see the [test files](https://github.com/NachoToast/Jukebot/blob/d1d1a3e75d903aafbd36f6eb6909d5c2e9c24e72/src/helpers/levenshtein.test.ts#L16-L19).
     */
    levenshteinThreshold: number;

    /** What Discord shows the bot is listening to. */
    activityString: string;

    /** This is the colour that embeds will have. */
    colourTheme: HexColorString;

    /** Won't allow adding items to queues greater than or equal to this in length.
     *
     * Set to `0` to have no maximum size.
     */
    maxQueueSize: number;

    /** Modifies the playback volume, valid range is between 0 and 1,
     * with 1 being no modification and 0 muting audio entirely. */
    volumeModifier: number;

    /** The maximum time to wait (in seconds) for the bot to connect and start playing audio once.
     *
     * Connecting and playing audio counts as 2 seperate tasks,
     * so the maximum time to connect AND play is `2 * maxReadyTime`
     *
     */
    maxReadyTime: number;

    /** The maximum time (in seconds) Jukebot will
     * stay in voice channels without playing anything.
     *
     * Set to `0` to stay in voice channels forever.
     */
    inactivityTimeout: number;
}

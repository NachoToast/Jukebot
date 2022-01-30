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
}

export default interface Config {
    /** Link to to the bot's source code. */
    sourceCode: string;

    /** If the bot doesn't connect to Discord after this many seconds,
     * the process will terminate.
     *
     * Set to 0 to never terminate.
     */
    readyTimeout: number;
}

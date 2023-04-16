import { AudioPlayer, AudioPlayerStatus, VoiceConnection, VoiceConnectionStatus, entersState } from '@discordjs/voice';
import { JukebotGlobals } from '../global';

/** Special error class only thrown by {@link awaitOrTimeout}. */
export class TimeoutError extends Error {}

/** Waits for a promise to resolve in the given number of seconds, or throws a {@link TimeoutError}. */
export async function awaitOrTimeout<T>(promise: Promise<T>, timeoutSeconds: number): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, timeoutSeconds * 1_000);
    });

    try {
        const race = await Promise.race([promise, timeoutPromise]);

        clearTimeout(timeout);

        // the timeout promise resolved before the supplied one did
        if (race === undefined) throw new TimeoutError();

        return race;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw new TimeoutError();
        throw error;
    }
}

/**
 * Returns a string with the given number and word, with the word pluralized if the number is not 1.
 * @example withPossiblePlural(0) // '0 seconds'
 * @example withPossiblePlural(1) // '1 second'
 * @example withPossiblePlural(1, 'die', 'dice') // '1 die'
 * @example withPossiblePlural(2, 'die', 'dice') // '2 dice'
 */
export function withPossiblePlural(n: number, word: string = 'second', plural: string = `${word}s`): string {
    return `${n} ${n === 1 ? word : plural}`;
}

/** Capitalizes the first character in a string. */
export function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function connectionEntersState(
    connection: VoiceConnection,
    status: VoiceConnectionStatus,
): Promise<VoiceConnection> {
    if (connection.state.status === status) return connection;

    let connectPromise: Promise<VoiceConnection>;

    if (JukebotGlobals.config.timeoutThresholds.connect === Infinity) {
        connectPromise = new Promise((resolve) => {
            connection.once(status, resolve);
        });
    } else connectPromise = entersState(connection, status, JukebotGlobals.config.timeoutThresholds.connect * 1_000);

    return await awaitOrTimeout(connectPromise, JukebotGlobals.config.timeoutThresholds.connect);
}

export async function playerEntersState(player: AudioPlayer, status: AudioPlayerStatus): Promise<AudioPlayer> {
    if (player.state.status === status) return player;

    let playPromise: Promise<AudioPlayer>;

    if (JukebotGlobals.config.timeoutThresholds.connect === Infinity) {
        playPromise = new Promise((resolve) => {
            player.once(status, resolve);
        });
    } else playPromise = entersState(player, status, JukebotGlobals.config.timeoutThresholds.play * 1_000);

    return await awaitOrTimeout(playPromise, JukebotGlobals.config.timeoutThresholds.play);
}

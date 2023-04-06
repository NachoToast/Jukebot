import { VoiceConnection, VoiceConnectionStatus, entersState } from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';
import { JukebotGlobals } from '../global';
import { timeoutMessages } from '../messages';

/** Waits for a promise to resolve in the given number of seconds, or throws an error. */
export async function awaitOrTimeout<T>(promise: Promise<T>, timeoutSeconds: number, message: string): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, timeoutSeconds * 1_000);
    });

    // the timeout promise resolved before the supplied one did
    const race = await Promise.race([promise, timeoutPromise]);

    clearTimeout(timeout);

    if (race === undefined) throw new Error(message);
    return race;
}

export async function connectionEntersState(
    connection: VoiceConnection,
    status: VoiceConnectionStatus,
    channel: VoiceBasedChannel,
): Promise<VoiceConnection> {
    let connectPromise: Promise<VoiceConnection>;

    if (JukebotGlobals.config.timeoutThresholds.connect === Infinity) {
        connectPromise = new Promise((resolve) => {
            connection.once(status, resolve);
        });
    } else connectPromise = entersState(connection, status, JukebotGlobals.config.timeoutThresholds.connect * 1_000);

    return await awaitOrTimeout(
        connectPromise,
        JukebotGlobals.config.timeoutThresholds.connect,
        timeoutMessages.connectTimeout(channel),
    );
}

// export async function playerEntersState(
//     player: AudioPlayer,
//     status: AudioPlayerStatus,
//     timeoutSeconds: number,
// ): Promise<AudioPlayer> {
//     if (timeoutSeconds === Infinity) {
//         return await new Promise((resolve) => {
//             player.once(status, resolve);
//         });
//     }
//     return entersState(player, status, timeoutSeconds * 1_000);
// }

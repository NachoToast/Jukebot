/*
    Connects to Discord (wow).
*/

import { type AppConfig, Color } from '@types';
import { awaitOrTimeout, colorize, TimeoutError } from '@utils';
import { Client, GatewayIntentBits } from 'discord.js';

export async function connectToDiscord({
    discordToken,
    discordLoginTimeout,
}: AppConfig): Promise<Client<true>> {
    const startTime = Date.now();

    const client = new Client<true>({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });

    try {
        await awaitOrTimeout(client.login(discordToken), discordLoginTimeout);
    } catch (error) {
        if (error instanceof TimeoutError) {
            throw new Error(
                `Took too long to login to Discord (max ${discordLoginTimeout.toLocaleString()}s)`,
            );
        }

        throw error;
    }

    const timestamp = new Date().toLocaleString('en-NZ');

    const timeTaken = colorize(
        (Date.now() - startTime).toLocaleString() + 'ms',
        Color.FgMagenta,
    );

    console.log(`[${timestamp}] ${client.user.tag} logged in (${timeTaken})`);

    return client;
}

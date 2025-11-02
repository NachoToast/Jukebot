import { config } from '@config';
import { awaitOrTimeout, logWithTimeTaken, TimeoutError } from '@utils';
import { Client, GatewayIntentBits, type SendableChannels } from 'discord.js';
import { fetchErrorChannel, registerHandlers } from './startup';
import { deployCommands } from './startup/deployCommands';

export let client: Client<true>;

export let errorChannel: SendableChannels | null;

export async function initialise(): Promise<void> {
    const { discordToken, discordLoginTimeout } = config;

    const startTime = Date.now();

    client = new Client<true>({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });

    registerHandlers();

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

    logWithTimeTaken(`${client.user.tag} logged in`, startTime);

    const [fetchedErrorChannel] = await Promise.all([fetchErrorChannel(), deployCommands()]);

    errorChannel = fetchedErrorChannel;
}

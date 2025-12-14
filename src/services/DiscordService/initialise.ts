import { Client, GatewayIntentBits } from "discord.js";
import { config } from "@/config";
import { awaitOrTimeout, TimeoutError } from "@/utils/awaitOrTimeout";
import { logWithTimeTaken } from "@/utils/logging";
import { deployCommands } from "./internal/startup/deployCommands";
import { fetchErrorChannel } from "./internal/startup/fetchErrorChannel";
import { registerHandlers } from "./internal/startup/registerHandlers";
import { setClient, setErrorChannel } from "./internal/state";

export async function initialiseDiscordService(): Promise<void> {
	const { discordToken, discordLoginTimeout } = config;

	const startTime = Date.now();

	const client = new Client<true>({
		intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
	});

	setClient(client);

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

	setErrorChannel(fetchedErrorChannel);
}

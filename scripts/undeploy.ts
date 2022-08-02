// undeploys

import { REST } from '@discordjs/rest';
import { Client, Routes, Snowflake } from 'discord.js';
import { getAuth } from '../src/functions/getAuth';

const { token } = getAuth();

async function guildUndeploy(guildId: Snowflake): Promise<void> {
    const client = new Client({
        intents: [],
    });

    await client.login(token);

    const rest = new REST({ version: `9` }).setToken(client.token!);
    await rest.put(Routes.applicationGuildCommands(client.user!.id, guildId), { body: [] });

    console.log(`Successfully undeployed application guild commands from ${guildId}`);
}

const guildId = process.argv.at(2);
if (guildId === undefined) {
    console.log(`Please specify a guild ID`);
} else {
    guildUndeploy(guildId);
}

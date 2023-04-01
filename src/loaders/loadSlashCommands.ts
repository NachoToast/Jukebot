import {
    Client,
    Collection,
    REST,
    RESTPostAPIApplicationCommandsJSONBody as RawSlashCommand,
    Routes,
} from 'discord.js';
import { Command } from '../commands/Command';
import { Colours } from '../types/Colours';
import { commands } from '../commands';
import { colourCycler } from '../misc/colourCycler';

/** Deploys slash commands individually to each guilds the bot is in. */
async function deployToAllGuilds(client: Client<true>, body: RawSlashCommand[]): Promise<void> {
    const allGuilds = await client.guilds.fetch();

    const rest = new REST({ version: '9' }).setToken(client.token);

    for (const [guildId, guild] of allGuilds) {
        try {
            await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body });
            console.log(`Deployed slash commands to ${Colours.FgMagenta}${guild.name}${Colours.Reset}`);
        } catch (error) {
            console.log(
                `Failed to deploy slash commands to guild ${Colours.FgMagenta}${guild.name}${Colours.Reset} (${guildId})`,
                error,
            );
        }
    }

    console.log(`Deployment to guilds finished (${allGuilds.size} total)`);
}

/** Deploys slash commands globally. */
async function deployGlobally(client: Client<true>, body: RawSlashCommand[]): Promise<void> {
    const rest = new REST({ version: '9' }).setToken(client.token);

    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body });
        console.log(`Deployed ${body.length} slash commands globally`);
    } catch (error) {
        console.log('Failed to deploy slash commands globally', error);
    }
}

export async function loadSlashCommands(client: Client<true>, devmode: boolean): Promise<Collection<string, Command>> {
    const toDeploy: RawSlashCommand[] = new Array(commands.length);

    const commandsCollection = new Collection<string, Command>();

    const cycler = colourCycler();

    const output: string[] = new Array(commands.length + 1);
    output[0] = `Loading ${commands.length} Commands: `;

    for (let i = 0; i < commands.length; i++) {
        const command = new commands[i]();
        commandsCollection.set(command.name, command);
        toDeploy[i] = command.build().toJSON();
        output[i + 1] = `${cycler.next().value}${command.name}${Colours.Reset}, `;
    }

    console.log(output.join(''));

    if (devmode) await deployToAllGuilds(client, toDeploy);
    else await deployGlobally(client, toDeploy);

    return commandsCollection;
}

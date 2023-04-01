import { Client, Events, GatewayIntentBits } from 'discord.js';
import { loadConfig, loginOrDie } from './loaders';
import { loadSlashCommands } from './loaders/loadSlashCommands';
import { GuildMember } from 'discord.js';

async function main() {
    const config = loadConfig();

    const devmode = process.argv.includes('--devmode');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const clientVersion = process.env.npm_package_version || (require('../package.json').version as string);

    const client = new Client<true>({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });

    await loginOrDie(client, config.discordToken, config.timeoutThresholds.discordLogin, devmode);

    const commands = await loadSlashCommands(client, devmode);

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isCommand()) return;
        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'This bot does not support DMs', ephemeral: true });
            return;
        }

        if (!interaction.isChatInputCommand()) {
            return;
        }

        const command = commands.get(interaction.commandName);

        if (command === undefined) {
            await interaction.reply({ content: 'This command does not yet exist', ephemeral: true });
            return;
        }

        if (
            interaction.channel === null ||
            interaction.guild === null ||
            !(interaction.member instanceof GuildMember)
        ) {
            return;
        }

        await command.execute({
            client,
            clientVersion,
            interaction,
            channel: interaction.channel,
            guild: interaction.guild,
            member: interaction.member,
        });
        return;
    });
}

main();

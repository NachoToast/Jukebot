import { Client, Events, GatewayIntentBits, GuildMember } from 'discord.js';
import { CommandDeployer } from './classes';
import { commands } from './commands';
import { JukebotGlobals } from './global';
import { Colours } from './types';

async function main() {
    const client = new Client<true>({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });

    let loginTimeout: NodeJS.Timeout | undefined;

    if (JukebotGlobals.config.timeoutThresholds.discordLogin !== 0) {
        loginTimeout = setTimeout(() => {
            console.log(`Took too long to login (max ${loginTimeout}s), exiting...`);
            process.exit(1);
        }, JukebotGlobals.config.timeoutThresholds.discordLogin * 1_000);
    }

    await client.login(JukebotGlobals.config.discordToken);
    clearTimeout(loginTimeout);

    console.log(
        `${client.user.tag} logged in (${Colours.FgMagenta}${Date.now() - JukebotGlobals.startTime}ms${Colours.Reset})`,
    );

    const commandDeployer = new CommandDeployer(client);

    await commandDeployer.autoDeploy();

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

        try {
            await command.execute({
                client,
                interaction,
                channel: interaction.channel,
                guild: interaction.guild,
                member: interaction.member,
            });
        } catch (error) {
            if (interaction.replied) {
                await interaction.followUp({ content: 'Something went while running this command' });
            } else {
                await interaction.reply({ content: 'Something went while running this command' });
            }
        }
    });
}

main();

import { Client, Events, GatewayIntentBits, GuildMember } from 'discord.js';
import { CommandDeployer, Jukebox } from './classes';
import { commands } from './commands';
import { JukebotGlobals } from './global';
import { Colours } from './types';
import { awaitOrTimeout } from './util';

process.on('uncaughtException', (error) => {
    console.log('Uncaught exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error, promise) => {
    console.log('Unhandled rejection:', promise);
    console.log('The error was:', error);
});

async function main() {
    const client = new Client<true>({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });

    try {
        await awaitOrTimeout(
            client.login(JukebotGlobals.config.discordToken),
            JukebotGlobals.config.timeoutThresholds.discordLogin,
            `Took too long to login (max ${JukebotGlobals.config.timeoutThresholds.discordLogin}s), exiting...`,
        );
    } catch (error) {
        console.log(error);
        process.exit(1);
    }

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

    client.on(Events.VoiceStateUpdate, (oldState, newState) => {
        // we only care when a voice channel changes (i.e. leaving, joining, and moving VCs)
        // this guard clause ignores other reasons, e.g. a user muting themselves
        if (oldState.channel?.id === newState.channel?.id) return;

        // I'm not sure when this is ever true
        if (oldState.member === null) return;

        const wasBotInvolved = oldState.member.user.id === client.user.id;

        // Jukebot was moved to another channel
        if (wasBotInvolved && oldState.channel !== null && newState.channel !== null) {
            // so update the target voice channel
            const jukebox = Jukebox.getJukebox(newState.guild.id);
            if (jukebox === undefined) return;
            jukebox.handleDragged(newState.channel);
        }
    });
}

main();

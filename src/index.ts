import { Client, Events, GatewayIntentBits, GuildMember } from 'discord.js';
import { CommandDeployer, EntityManager } from './classes';
import { commands } from './commands';
import { JukebotGlobals } from './global';
import { timeoutMessage } from './messages';
import { Colours } from './types';
import { TimeoutError, awaitOrTimeout } from './util';

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
        );
    } catch (error) {
        if (error instanceof TimeoutError) console.log(timeoutMessage.discordLogin);
        else console.log(error);
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
                member: interaction.member,
            });
        } catch (error) {
            console.log(
                `${Colours.FgMagenta}${interaction.member.user.username}${Colours.Reset} encountered an error while using the ${Colours.FgMagenta}/${interaction.commandName}${Colours.Reset} command in ${Colours.FgMagenta}${interaction.guild.name}${Colours.Reset}:`,
                error,
            );
            if (interaction.replied) {
                await interaction.editReply({ content: 'Something went while running this command' });
            } else {
                await interaction.reply({ content: 'Something went while running this command' });
            }
        }
    });

    client.on(Events.VoiceStateUpdate, (oldState, newState) => {
        // we only care when a voice channel changes (i.e. leaving, joining, and moving VCs)
        // this guard clause ignores other reasons, e.g. a user muting themselves
        if (oldState.channel?.id === newState.channel?.id) return;

        // ignore join events
        if (oldState.channel === null) return;

        // ignore voice events from servers the bot is not active in
        const jukebox = EntityManager.getGuildInstance(oldState.guild.id);
        if (jukebox === undefined) return;

        const isBot = oldState.member?.user.id === client.user.id;

        // user left the bot's voice channel
        if (!isBot && oldState.channel.id === jukebox.targetVoiceChannel.id) {
            if (JukebotGlobals.devmode) {
                console.log(
                    `${oldState.member?.user.username} left ${oldState.channel.name} (target: ${jukebox.targetVoiceChannel.name})`,
                );
            }
            if (!jukebox.hasAudioListeners()) jukebox.pauseDueToNoListeners();
            return;
        }

        // bot was moved to another voice channel
        if (isBot && newState.channel !== null) {
            if (JukebotGlobals.devmode) {
                console.log(
                    `Bot was moved from ${oldState.channel.name} to ${newState.channel.name} (target: ${jukebox.targetVoiceChannel.name})`,
                );
            }
            jukebox.handleChannelDrag(newState.channel);
            return;
        }

        // bot was disconnected from it's current voice channel
        if (isBot && newState.channel === null) {
            if (JukebotGlobals.devmode) {
                console.log(
                    `Bot was disconnected from ${oldState.channel.name} (target: ${jukebox.targetVoiceChannel.name})`,
                );
            }
            jukebox.destroyInstance();
            return;
        }

        // // I'm not sure when this is ever true
        // if (oldState.member === null) return;

        // const wasBotInvolved = oldState.member.user.id === client.user.id;

        // // Jukebot was moved to another channel
        // if (wasBotInvolved && oldState.channel !== null && newState.channel !== null) {
        //     // so update the target voice channel

        //     const jukebox = EntityManager.getGuildInstance(oldState.guild.id);
        //     if (jukebox === undefined) return;
        //     jukebox.handleChannelDrag(newState.channel);
        // }
    });
}

main();

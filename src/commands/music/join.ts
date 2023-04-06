import { channelMention } from 'discord.js';
import { Jukebox } from '../../classes';
import { Command } from '../../types';

export const joinCommand: Command = {
    name: 'join',
    description: 'Makes the bot join the voice channel you are in',
    execute: async function ({ interaction, member, guild }): Promise<void> {
        if (member.voice.channel === null) {
            await interaction.reply({ content: 'You must be in a voice channel to use this command' });
            return;
        }

        let jukebox = Jukebox.getJukebox(guild.id);

        if (jukebox !== undefined) {
            if (jukebox.getTargetVoiceChannel()?.id === member.voice.channel.id) {
                await interaction.reply({
                    content: `Already in ${channelMention(member.voice.channel.id)}`,
                });
                return;
            }
            jukebox.setTargetVoiceChannel(member.voice.channel);
        } else {
            jukebox = Jukebox.makeJukebox(interaction, member.voice.channel);
        }

        try {
            await jukebox.connectToTarget(interaction);
            await interaction.reply({ content: `Joined ${channelMention(member.voice.channel.id)}` });
        } catch (error) {
            await interaction.reply({
                content: `Failed to join ${channelMention(member.voice.channel.id)}${
                    error instanceof Error ? `: ${error.message}` : ''
                }`,
            });
        }
    },
};

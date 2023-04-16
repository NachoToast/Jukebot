import { channelMention } from 'discord.js';
import { EntityManager } from '../../classes';
import { errorMessages } from '../../messages';
import { Command } from '../../types';

export const joinCommand: Command = {
    name: 'join',
    description: 'Makes the bot join the voice channel you are in',
    execute: async function ({ interaction, channel, member }): Promise<void> {
        if (member.voice.channel === null) {
            await interaction.reply({ content: errorMessages.notInVoice });
            return;
        }

        const jukebox = EntityManager.getGuildInstance(member.guild.id);

        if (jukebox === undefined) {
            EntityManager.makeGuildInstance(channel, member.voice.channel);
            await interaction.reply({ content: `Joined ${channelMention(member.voice.channel.id)}` });
            return;
        }

        if (jukebox.targetVoiceChannel.id === member.voice.channel.id) {
            await interaction.reply({ content: `I'm already in ${channelMention(jukebox.targetVoiceChannel.id)}` });
            return;
        }

        await interaction.reply({
            content: `Moving from ${channelMention(jukebox.targetVoiceChannel.id)} to ${channelMention(
                member.voice.channel.id,
            )}`,
        });

        jukebox.updateTargetVoiceChannel(member.voice.channel);
        await jukebox.ensureConnectionReady();

        await interaction.editReply({ content: `Moved to ${channelMention(jukebox.targetVoiceChannel.id)}` });
    },
};

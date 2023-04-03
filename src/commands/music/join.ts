import { joinVoiceChannel } from '@discordjs/voice';
import { Command } from '../../types';

export const joinCommand: Command = {
    name: 'join',
    description: 'Makes the bot join the voice channel you are in',
    execute: async function ({ interaction, member, guild }): Promise<void> {
        if (member.voice.channelId === null) {
            await interaction.reply({ content: 'You must be in a voice channel to use this command' });
            return;
        }

        joinVoiceChannel({
            channelId: member.voice.channelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
        });
    },
};

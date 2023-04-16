import { EntityManager } from '../../classes';
import { Command } from '../../types';

export const resumeCommand: Command = {
    name: 'resume',
    description: 'Resumes playback',
    execute: async function ({ interaction, member }): Promise<void> {
        const jukebox = EntityManager.getGuildInstance(member.guild.id);

        if (jukebox === undefined) {
            await interaction.reply({ content: 'Nothing to resume' });
            return;
        }

        if (jukebox.state.status === 'active') {
            await interaction.reply({ content: 'Already playing' });
        }

        if (member.voice.channel === null || member.voice.channel.id !== jukebox.targetVoiceChannel.id) {
            await interaction.reply({ content: 'You must be in the same voice channel as me to resume playback' });
            return;
        }

        if (jukebox.unpause()) await interaction.reply({ content: 'Resumed' });
        else await interaction.reply({ content: 'Unable to resume ¯\\_(ツ)_/¯' });
    },
};

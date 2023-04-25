import { EntityManager } from '../../classes';
import { errorMessages } from '../../messages';
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
            await interaction.reply({ content: 'Already resumed' });
        }

        if (member.voice.channel === null || member.voice.channel.id !== jukebox.targetVoiceChannel.id) {
            await interaction.reply({
                content: errorMessages.notInSameVoiceChannel(jukebox.targetVoiceChannel.id, 'resume playback'),
            });
            return;
        }

        if (jukebox.unpause()) await interaction.reply({ content: 'Resumed' });
        else await interaction.reply({ content: 'Unable to resume ¯\\_(ツ)_/¯' });
    },
};

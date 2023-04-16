import { EntityManager } from '../../classes';
import { Command } from '../../types';

export const pauseCommand: Command = {
    name: 'pause',
    description: 'Pauses playback',
    execute: async function ({ interaction, member }): Promise<void> {
        const jukebox = EntityManager.getGuildInstance(member.guild.id);

        if (jukebox === undefined) {
            await interaction.reply({ content: 'Nothing to pause' });
            return;
        }

        if (jukebox.state.status === 'idle') {
            await interaction.reply({ content: 'Already paused' });
            return;
        }

        if (member.voice.channel === null || member.voice.channel.id !== jukebox.targetVoiceChannel.id) {
            await interaction.reply({ content: 'You must be in the same voice channel as me to pause playback' });
            return;
        }

        if (jukebox.pause()) await interaction.reply({ content: 'Paused' });
        else await interaction.reply({ content: 'Unable to pause ¯\\_(ツ)_/¯' });
    },
};

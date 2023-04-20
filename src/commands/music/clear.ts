import { EntityManager } from '../../classes';
import { Command } from '../../types';
import { withPossiblePlural } from '../../util';

export const clearCommand: Command = {
    name: 'clear',
    description: 'Clears the queue',
    execute: async function ({ interaction, member }): Promise<void> {
        const jukebox = EntityManager.getGuildInstance(member.guild.id);

        const size = jukebox?.upcomingQueue.getSize() ?? 0;

        if (jukebox === undefined || size === 0) {
            await interaction.reply({ content: 'Nothing is currently queued' });
            return;
        }

        if (member.voice.channel === null || member.voice.channel.id !== jukebox.targetVoiceChannel.id) {
            await interaction.reply({ content: 'You must be in the same voice channel as me to clear the queue' });
            return;
        }

        jukebox.upcomingQueue.clear();

        await interaction.reply({ content: `Cleared ${withPossiblePlural(size, 'song')} from the queue` });
    },
};

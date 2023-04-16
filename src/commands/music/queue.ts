import { EntityManager } from '../../classes';
import { Command } from '../../types';

export const queueCommand: Command = {
    name: 'queue',
    description: 'Shows the current queue',
    execute: async function ({ interaction, member }): Promise<void> {
        const jukebox = EntityManager.getGuildInstance(member.guild.id);

        if (jukebox === undefined || jukebox.upcomingQueue.getSize() === 0) {
            await interaction.reply({ content: 'Nothing is currently queued' });
            return;
        }

        await jukebox.upcomingQueue.makeQueueEmbed(interaction, member);
    },
};

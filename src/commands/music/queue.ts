import { EntityManager } from '../../classes';
import { errorMessages } from '../../messages';
import { Command } from '../../types';

export const queueCommand: Command = {
    name: 'queue',
    description: 'Shows the current queue',
    execute: async function ({ interaction, channel, member }): Promise<void> {
        const jukebox = EntityManager.getGuildInstance(member.guild.id);

        if (jukebox === undefined) {
            await interaction.reply({ content: errorMessages.emptyQueue });
            return;
        }

        const response = jukebox.upcomingQueue.makeQueueEmbed(interaction, channel, member);

        await interaction.reply(response);
    },
};

import { EntityManager } from '../../classes';
import { errorMessages } from '../../messages';
import { Command } from '../../types';

export const previousCommand: Command = {
    name: 'previous',
    description: 'Lists the recently played songs',
    execute: async function ({ interaction, channel, member }): Promise<void> {
        const jukebox = EntityManager.getGuildInstance(member.guild.id);

        if (jukebox === undefined) {
            await interaction.reply({ content: errorMessages.emptyPreviousQueue });
            return;
        }

        const response = jukebox.historyQueue.makeQueueEmbed(interaction, channel, member);

        await interaction.reply(response);
    },
};

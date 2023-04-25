import { EntityManager } from '../../classes';
import { errorMessages } from '../../messages';
import { Command } from '../../types';

export const removeCommand: Command = {
    name: 'remove',
    description: 'Removes a song from the queue',
    execute: async function ({ interaction, member }): Promise<void> {
        const jukebox = EntityManager.getGuildInstance(member.guild.id);

        const size = jukebox?.upcomingQueue.getSize() ?? 0;

        if (jukebox === undefined || size === 0) {
            await interaction.reply({ content: errorMessages.emptyQueue });
            return;
        }

        if (member.voice.channel === null || member.voice.channel.id !== jukebox.targetVoiceChannel.id) {
            await interaction.reply({
                content: errorMessages.notInSameVoiceChannel(
                    jukebox.targetVoiceChannel.id,
                    'remove items from the queue',
                ),
            });
            return;
        }

        const start = interaction.options.getInteger('position', true);
        const amount = interaction.options.getInteger('amount', false) ?? 1;

        if (start < 1 || start > size) {
            await interaction.reply({ content: `Invalid start position (should be between 1 and ${size})` });
            return;
        }

        if (amount < 1) {
            await interaction.reply({ content: 'Invalid amount (must be at least 1)' });
            return;
        }

        const removed = jukebox.upcomingQueue.removeItems(start - 1, amount);

        if (removed.length === 1) {
            await interaction.reply({
                content: `Removed **${removed[0].title}** (${removed[0].durationString}) from the queue`,
            });
            return;
        }

        await interaction.reply({ content: `Removed **${removed.length}** songs from the queue` });
    },
    build: function (baseCommand) {
        baseCommand
            .addIntegerOption((option) =>
                option.setName('position').setDescription('Position of song to remove in the queue').setRequired(true),
            )
            .addIntegerOption((option) =>
                option.setName('amount').setDescription('Number of songs to remove, 1 by default').setRequired(false),
            );
    },
};

import { EntityManager } from '../../classes';
import { errorMessages } from '../../messages';
import { Command } from '../../types';

export const shuffleCommand: Command = {
    name: 'shuffle',
    description: 'Shuffles the queue',
    execute: async function ({ interaction, member }): Promise<void> {
        const jukebox = EntityManager.getGuildInstance(member.guild.id);

        const size = jukebox?.upcomingQueue.getSize() ?? 0;

        if (jukebox === undefined || size === 0) {
            await interaction.reply({ content: errorMessages.emptyQueue });
            return;
        }

        if (member.voice.channel === null || member.voice.channel.id !== jukebox.targetVoiceChannel.id) {
            await interaction.reply({
                content: errorMessages.notInSameVoiceChannel(jukebox.targetVoiceChannel.id, 'shuffle the queue'),
            });
            return;
        }

        if (jukebox.upcomingQueue.getSize() === 1) {
            await interaction.reply({ content: 'Queue is too short to shuffle (2 or more songs required)' });
            return;
        }

        jukebox.upcomingQueue.shuffle();

        await interaction.reply({ content: `Shuffled ${jukebox.upcomingQueue.getSize()} songs` });
    },
};

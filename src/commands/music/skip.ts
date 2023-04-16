import { EntityManager } from '../../classes';
import { Command } from '../../types';

export const skipCommand: Command = {
    name: 'skip',
    description: 'Skips to the next song in the queue',
    execute: async function ({ interaction, member }): Promise<void> {
        const jukebox = EntityManager.getGuildInstance(member.guild.id);

        if (jukebox === undefined || jukebox.state.status !== 'active') {
            await interaction.reply({ content: 'Not currently playing anything' });
            return;
        }

        const currentlyPlaying = jukebox.state.currentlyPlaying;

        const secondsLeft =
            currentlyPlaying.durationSeconds - Math.floor((Date.now() - jukebox.state.playingSince) / 1000);

        await interaction.reply({ content: 'Skipping...' });

        await jukebox.playNextInQueue(interaction);

        await interaction.editReply({ content: `Skipped **${currentlyPlaying.title}** (${secondsLeft} seconds left)` });
    },
};

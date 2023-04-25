import { EntityManager, Hopper } from '../../classes';
import { errorMessages } from '../../messages';
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

        if (member.voice.channel === null || member.voice.channel.id !== jukebox.targetVoiceChannel.id) {
            await interaction.reply({
                content: errorMessages.notInSameVoiceChannel(jukebox.targetVoiceChannel.id, 'skip the current song'),
            });
            return;
        }

        const secondsElapsed = Math.floor((Date.now() - jukebox.state.playingSince) / 1_000);

        const currentlyPlaying = jukebox.state.currentlyPlaying;

        await interaction.reply({ content: 'Skipping...' });

        await jukebox.playNextInQueue(interaction);

        await interaction.editReply({
            content: `Skipped **${currentlyPlaying.title}** (${Hopper.formatDuration(secondsElapsed)} / ${
                currentlyPlaying.durationString
            })`,
        });
    },
};

import { Allay, EntityManager, MusicDisc } from '../../classes';
import { errorMessages } from '../../messages';
import { Command } from '../../types';

export const playCommand: Command = {
    name: 'play',
    description: 'Adds a song to the queue and starts playback',
    execute: async function ({ interaction, channel, member }): Promise<void> {
        if (member.voice.channel === null) {
            await interaction.reply({ content: errorMessages.notInVoice });
            return;
        }

        let jukebox = EntityManager.getGuildInstance(member.guild.id);

        if (jukebox?.upcomingQueue.isFull()) {
            await interaction.reply({ content: 'The queue is full!' });
            return;
        }

        await interaction.reply({ content: 'Searching...' });

        const searchTerm = interaction.options.getString('song', true);
        const shuffle = !!interaction.options.get('shuffle');

        const allay = new Allay(interaction, member, channel, searchTerm, jukebox?.upcomingQueue.getFreeSlots());
        const result = await allay.retrieveItems();
        jukebox ??= EntityManager.makeGuildInstance(channel, member.voice.channel);
        const embed = allay.makeEmbed(result, jukebox);
        await interaction.editReply({ embeds: [embed] });

        if (result instanceof MusicDisc) jukebox.upcomingQueue.addItems([result]);
        else {
            if (shuffle) result.items.sort(() => Math.random() - 0.5);
            jukebox.upcomingQueue.addItems(result.items);
        }

        if (jukebox.state.status === 'idle') {
            const newState = await jukebox.playNextInQueue(interaction);
            if (
                newState.status === 'active' &&
                newState.currentlyPlaying === result &&
                jukebox.textChannel.id === channel.id
            ) {
                await interaction.editReply({ content: 'Immediately playing result ⬇️' });
                return;
            }
        } else {
            await interaction.editReply({ content: '' });
        }
    },
    build: function (baseCommand) {
        baseCommand
            .addStringOption((option) =>
                option.setName('song').setDescription('The song name or YouTube/Spotify URL').setRequired(true),
            )
            .addBooleanOption((option) =>
                option
                    .setName('shuffle')
                    .setDescription(
                        'Shuffle the results before adding them to the queue, only applicable for playlists',
                    ),
            );
    },
};

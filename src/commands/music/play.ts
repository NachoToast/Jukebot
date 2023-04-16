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

        await interaction.reply({ content: 'Searching...' });

        const searchTerm = interaction.options.getString('song', true);
        const shuffle = !!interaction.options.get('shuffle');

        const allay = new Allay(interaction, member, searchTerm);
        const result = await allay.retrieveItems();
        const embed = allay.makeEmbed(result);
        const jukebox = EntityManager.getOrMakeGuildInstance(channel, member.voice.channel);

        if (result instanceof MusicDisc) {
            jukebox.upcomingQueue.addItems([result]);
        } else {
            if (shuffle) result.items.sort(() => Math.random() - 0.5);
            jukebox.upcomingQueue.addItems(result.items);
        }

        if (jukebox.state.status === 'idle') await jukebox.playNextInQueue(interaction);

        await interaction.editReply({ content: '', embeds: [embed] });
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

import { Allay, MusicDisc } from '../../classes';
import { Command } from '../../types';

export const searchCommand: Command = {
    name: 'search',
    description: "Search for a song, but don't add it to the queue",
    execute: async function ({ interaction }): Promise<void> {
        const searchTerm = interaction.options.getString('song', true);

        try {
            const allay = new Allay(interaction, searchTerm);
            const result = await allay.retrieveItems();

            if (result instanceof MusicDisc) {
                await interaction.reply({ content: `Found: ${result.title}` });
            } else {
                await interaction.reply({ content: `Found Playlist: ${result.playlist.name}` });
            }
        } catch (error) {
            if (!(error instanceof Error)) throw error;
            await interaction.reply({ content: error.message });
        }
    },
    build: function (baseCommand) {
        baseCommand.addStringOption((option) =>
            option.setName('song').setDescription('The song name of YouTube/Spotify URL').setRequired(true),
        );
    },
};

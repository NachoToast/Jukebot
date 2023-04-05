import { Allay } from '../../classes';
import { Command } from '../../types';

export const searchCommand: Command = {
    name: 'search',
    description: "Search for a song, but don't add it to the queue",
    execute: async function ({ interaction, member }): Promise<void> {
        await interaction.reply({ content: 'Searching...' });
        const searchTerm = interaction.options.getString('song', true);

        try {
            const allay = new Allay(interaction, member, searchTerm);
            const result = await allay.retrieveItems();

            await interaction.editReply({ content: '', embeds: [allay.makeEmbed(result)] });
        } catch (error) {
            if (!(error instanceof Error)) throw error;
            await interaction.editReply({ content: error.message });
        }
    },
    build: function (baseCommand) {
        baseCommand.addStringOption((option) =>
            option.setName('song').setDescription('The song name of YouTube/Spotify URL').setRequired(true),
        );
    },
};

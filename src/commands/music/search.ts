import { Allay } from '../../classes';
import { Command } from '../../types';

export const searchCommand: Command = {
    name: 'search',
    description: "Searches for a song, but doesn't add it to the queue",
    execute: async function ({ interaction, member }): Promise<void> {
        await interaction.reply({ content: 'Searching...' });
        const searchTerm = interaction.options.getString('song', true);

        const allay = new Allay(interaction, member, searchTerm);
        const result = await allay.retrieveItems();

        await interaction.editReply({ content: '', embeds: [allay.makeEmbed(result)] });
    },
    build: function (baseCommand) {
        baseCommand.addStringOption((option) =>
            option.setName('song').setDescription('The song name or YouTube/Spotify URL').setRequired(true),
        );
    },
};

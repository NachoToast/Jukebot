import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../types';

export const sourceCommand: Command = {
    name: 'source',
    description: "Creates a link to the bot's source code",
    execute: async function ({ interaction }): Promise<void> {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel('Sauce')
                .setStyle(ButtonStyle.Link)
                .setURL('https://github.com/NachoToast/Jukebot'),
        );

        await interaction.reply({ content: "📁 Here's my source code!", components: [row] });
    },
};

import { Command } from '../../types';

export const sourceCommand: Command = {
    name: 'source',
    description: "Creates a link to the bot's source code",
    execute: async function ({ interaction }): Promise<void> {
        await interaction.reply({ content: 'https://github.com/NachoToast/Jukebot' });
    },
};

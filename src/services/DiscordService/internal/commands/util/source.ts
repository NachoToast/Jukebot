import type { Command } from '../Command';

export const sourceCommand: Command = {
    name: 'source',

    description: "Creates a link to Jukebot's source code",

    async execute(interaction) {
        await interaction.reply({ content: 'https://github.com/NachoToast/Jukebot' });
    },
};

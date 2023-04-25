import { configToString } from '../../global/config';
import { Command } from '../../types';

export const configCommand: Command = {
    name: 'config',
    description: 'Displays current configuration options',
    execute: async function ({ interaction }): Promise<void> {
        await interaction.reply(configToString());
    },
};

import { EntityManager } from '../../classes';
import { Command } from '../../types';

export const debugCommand: Command = {
    name: 'debug',
    description: 'Displays debug information, recommended only for developers',
    execute: async function ({ member, interaction }): Promise<void> {
        const instance = EntityManager.getGuildInstance(member.guild.id);

        if (instance === undefined) await interaction.reply({ content: 'No instance found' });
        else await interaction.reply(instance.toString());
    },
};

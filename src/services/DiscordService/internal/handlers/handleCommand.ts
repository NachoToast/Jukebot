import { DisplayableError } from '@errors';
import { GuildMember, type ChatInputCommandInteraction } from 'discord.js';
import { commands } from '../commands';

export async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const { member } = interaction;

    if (!(member instanceof GuildMember)) {
        throw new DisplayableError('This command can only be used in a server');
    }

    const command = commands.get(interaction.commandName);

    if (command === undefined) {
        throw new DisplayableError('Command not found');
    }

    await command.execute(interaction, member);
}

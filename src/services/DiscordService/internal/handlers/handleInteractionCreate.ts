import { DisplayableError } from '@errors';
import { InteractionType, type Interaction } from 'discord.js';
import { handleCommand } from './handleCommand';

export async function handleInteractionCreate(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
        await handleCommand(interaction);
    } else {
        throw new DisplayableError(
            `Unknown interaction type: ${InteractionType[interaction.type]}`,
        );
    }
}

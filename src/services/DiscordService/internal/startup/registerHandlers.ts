import { Events } from 'discord.js';
import { handleError } from '../../handleError';
import { handleInteractionCreate } from '../handlers';
import { client } from '../state';

export function registerHandlers(): void {
    client.on(Events.InteractionCreate, (interaction) => {
        handleInteractionCreate(interaction).catch((error: unknown) => {
            handleError(error, interaction);
        });
    });
}

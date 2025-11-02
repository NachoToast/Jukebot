import { config } from '@config';
import { DisplayableError } from '@errors';
import { parseErrorStack } from '@utils';
import {
    bold,
    channelMention,
    InteractionType,
    roleMention,
    userMention,
    type Interaction,
    type MessageMentionOptions,
} from 'discord.js';
import { errorChannel } from './internal/state';
import { tryReplyTo } from './internal/tryReplyTo';

/**
 * General-use error handler for the whole app.
 *
 * Tries to show the error to the instigating user if possible, otherwise logs it to the error
 * channel.
 */
export function handleError(error: unknown, interaction?: Interaction): void {
    if (!Error.isError(error)) {
        // Not an error, wtf.
        throw error;
    }

    if (error instanceof DisplayableError && interaction?.isRepliable()) {
        // Best case, we can nicely show the error to the user and not bother with anything else.
        tryReplyTo(interaction, error.getPayload());
        return;
    }

    if (interaction?.isRepliable()) {
        // Not so nice case, an error occurred that wasn't expected, we can't show it directly to
        // the user for security reasons, but we can at least let them know something went wrong.
        tryReplyTo(interaction, {
            content: `An error occurred while handling your interaction and was reported`,
        });

        // Note the lack of a return statement here.
    }

    if (errorChannel === null) {
        console.error(error);
        return;
    }

    const mainInfo: string[] = [];
    const allowedMentions: MessageMentionOptions = { parse: [] };

    if (interaction === undefined) {
        mainInfo.push(`A non-interaction related error occurred in the bot`);
    } else {
        if (interaction.isChatInputCommand()) {
            const commandName = bold(interaction.commandName);

            mainInfo.push(`An error occurred in the ${commandName} command`);
        } else {
            const commandType = bold(InteractionType[interaction.type]);

            mainInfo.push(`An error occurred in an unknown interaction of type ${commandType}`);
        }

        const user = userMention(interaction.user.id);

        mainInfo.push(`User: ${user} (${interaction.user.id})`);

        if (interaction.channelId) {
            const channel = channelMention(interaction.channelId);

            mainInfo.push(`Channel: ${channel} (${interaction.channelId})`);
        }
    }

    if (error.name !== 'Error') {
        mainInfo.push(`Type: ${error.name}`);
    }

    mainInfo.push(`Message: ${error.message}`);

    if (error.stack !== undefined) {
        mainInfo.push(...parseErrorStack(error.stack));
    }

    if (config.developerRoleId !== null) {
        mainInfo.push(roleMention(config.developerRoleId));
        allowedMentions.roles = [config.developerRoleId];
    }

    errorChannel.send({ content: mainInfo.join('\n'), allowedMentions }).catch(console.error);
}

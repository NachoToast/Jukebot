import type { InteractionReplyOptions } from 'discord.js';

/** Represents an error we can safely show to the user. */
export class DisplayableError extends Error {
    public getPayload(): InteractionReplyOptions {
        return { content: this.message, allowedMentions: { parse: [] } };
    }
}

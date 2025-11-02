import { config } from '@config';
import { Color } from '@types';
import { colorize } from '@utils';
import type { SendableChannels } from 'discord.js';
import { client } from '../state';

export async function fetchErrorChannel(): Promise<SendableChannels | null> {
    if (config.errorChannelId === null) {
        return null;
    }

    const channel = await client.channels.fetch(config.errorChannelId);

    if (channel === null) {
        const channelId = colorize(config.errorChannelId, Color.FgMagenta);

        throw new Error(`Could not find error channel with ID ${channelId}`);
    }

    if (!channel.isSendable()) {
        const channelId = colorize(config.errorChannelId, Color.FgMagenta);

        throw new Error(`Error channel ${channelId} must be a sendable channel`);
    }

    return channel;
}

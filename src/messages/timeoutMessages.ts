import { VoiceBasedChannel, channelMention } from 'discord.js';
import { JukebotGlobals } from '../global';
import { Search } from '../types';

export const timeoutMessages = {
    /** Sent when unable to fetch search results in the configured maximum time. */
    searchTimeout: (searchSource: Search['source'], searchTerm: string) =>
        `Unable to fetch results for ${
            searchSource !== 'text' ? searchTerm : `"${searchTerm}"`
        } in a reasonable amount of time (${JukebotGlobals.config.timeoutThresholds.fetchResults} second${
            JukebotGlobals.config.timeoutThresholds.fetchResults !== 1 ? 's' : ''
        })`,

    connectTimeout: (channel: VoiceBasedChannel) =>
        `Unable to connect to ${channelMention(channel.id)} in a reasonable amount of time (${
            JukebotGlobals.config.timeoutThresholds.connect
        } second${JukebotGlobals.config.timeoutThresholds.connect !== 1 ? 's' : ''})`,
};

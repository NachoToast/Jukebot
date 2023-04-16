import { VoiceBasedChannel, channelMention } from 'discord.js';
import { MusicDisc } from '../classes';
import { JukebotGlobals } from '../global';
import { Config, Search } from '../types';
import { withPossiblePlural } from '../util';

const timeoutThresholds = JukebotGlobals.config.timeoutThresholds;

type RelevantTimeoutKeys = Exclude<keyof Config['timeoutThresholds'], 'stopMessageListeners'>;

/** Messages sent when an asynchronous action takes longer than it is allowed to. */
export const timeoutMessage = {
    discordLogin: `Took too long to login (max ${timeoutThresholds.discordLogin}s), exiting...`,

    fetchResults: (searchSource: Search['source'], searchTerm: string) =>
        `Unable to fetch results for ${
            searchSource !== 'text' ? searchTerm : `"${searchTerm}"`
        } in a reasonable amount of time (${withPossiblePlural(timeoutThresholds.fetchResults)})`,

    generateResource: (disc: MusicDisc) =>
        `Unable to load "${disc.title}" (${disc.durationString}) in a reasonable amount of time (${withPossiblePlural(
            timeoutThresholds.generateResource,
        )})`,

    connect: (channel: VoiceBasedChannel) =>
        `Unable to connect to ${channelMention(channel.id)} in a reasonable amount of time (${withPossiblePlural(
            timeoutThresholds.connect,
        )})`,

    play: `Unable to play in a reasonable amount of time (${withPossiblePlural(timeoutThresholds.play)}`,

    inactivity: '',

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies Record<RelevantTimeoutKeys, string | ((...args: any[]) => string)>;

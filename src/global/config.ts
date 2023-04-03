import { Config } from '../types';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rawConfig: Partial<Config> = require('../../config.json');

if (rawConfig.discordToken === undefined) {
    throw new Error('Missing discordToken in config.json');
}

export const config: Config = {
    discordToken: rawConfig.discordToken,
    maxQueueSize: rawConfig.maxQueueSize ?? 100,
    statusTimePeriod: rawConfig.statusTimePeriod ?? 120,
    levenshteinThreshold: rawConfig.levenshteinThreshold ?? 0.1,
    volumeModifier: rawConfig.volumeModifier ?? 0.1,
    embedColour: rawConfig.embedColour ?? '#794C36',
    timeoutThresholds: {
        discordLogin: rawConfig.timeoutThresholds?.discordLogin ?? 30,
        fetchResults: rawConfig.timeoutThresholds?.fetchResults ?? 30,
        generateResource: rawConfig.timeoutThresholds?.generateResource ?? 10,
        connect: rawConfig.timeoutThresholds?.connect ?? 10,
        play: rawConfig.timeoutThresholds?.play ?? 10,
        inactivity: rawConfig.timeoutThresholds?.inactivity ?? 300,
        clearQueue: rawConfig.timeoutThresholds?.clearQueue ?? 300,
        stopMessageListeners: rawConfig.timeoutThresholds?.stopMessageListeners ?? 300,
    },
};

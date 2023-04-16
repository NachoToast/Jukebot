import { Config } from '../types';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rawConfig: Partial<Config> = require('../../config.json');

if (rawConfig.discordToken === undefined) {
    throw new Error('Missing discordToken in config.json');
}

function convertTimeoutThreshold(key: keyof Config['timeoutThresholds'], fallback: number) {
    if (rawConfig.timeoutThresholds?.[key] !== undefined) {
        if (rawConfig.timeoutThresholds[key] === 0) {
            return Infinity;
        }
        return rawConfig.timeoutThresholds[key];
    }
    return fallback;
}

export const config: Config = {
    discordToken: rawConfig.discordToken,
    maxQueueSize: rawConfig.maxQueueSize ?? 1_000,
    previousQueueSize: rawConfig.previousQueueSize ?? 20,
    statusTimePeriod: rawConfig.statusTimePeriod ?? 120,
    levenshteinThreshold: rawConfig.levenshteinThreshold ?? 0.1,
    volumeModifier: rawConfig.volumeModifier ?? 0.1,
    embedColour: rawConfig.embedColour ?? '#794C36',
    timeoutThresholds: {
        discordLogin: convertTimeoutThreshold('discordLogin', 30),
        fetchResults: convertTimeoutThreshold('fetchResults', 30),
        generateResource: convertTimeoutThreshold('generateResource', 10),
        connect: convertTimeoutThreshold('connect', 10),
        play: convertTimeoutThreshold('play', 10),
        inactivity: convertTimeoutThreshold('inactivity', 300),
        stopMessageListeners: convertTimeoutThreshold('stopMessageListeners', 300),
    },
};

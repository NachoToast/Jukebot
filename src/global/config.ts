import { ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionReplyOptions } from 'discord.js';
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

// these default values must match those in the config schema file (`.github/config.schema.json`)
export const config: Config = {
    discordToken: rawConfig.discordToken,
    maxQueueSize: rawConfig.maxQueueSize ?? 1_000,
    previousQueueSize: rawConfig.previousQueueSize ?? 20,
    statusTimePeriod: rawConfig.statusTimePeriod ?? 120,
    levenshteinThreshold: rawConfig.levenshteinThreshold ?? 0.1,
    volumeModifier: rawConfig.volumeModifier ?? 0.3,
    embedColour: rawConfig.embedColour ?? '#794C36',
    timeoutThresholds: {
        discordLogin: convertTimeoutThreshold('discordLogin', 30),
        fetchResults: convertTimeoutThreshold('fetchResults', 30),
        generateResource: convertTimeoutThreshold('generateResource', 15),
        connect: convertTimeoutThreshold('connect', 15),
        play: convertTimeoutThreshold('play', 15),
        inactivity: convertTimeoutThreshold('inactivity', 300),
        stopMessageListeners: convertTimeoutThreshold('stopMessageListeners', 180),
    },
};

export function configToString(): InteractionReplyOptions {
    const safeConfig: Partial<Config> = { ...config };
    delete safeConfig.discordToken;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setLabel('View Schema')
            .setStyle(ButtonStyle.Link)
            .setURL('https://github.com/NachoToast/Jukebot/blob/main/.github/config-schema.json'),
    );

    return {
        content: '```json\n' + JSON.stringify(safeConfig, null, 4) + '\n```',
        components: [row],
    };
}

import { HexColorString } from 'discord.js';

export interface Config {
    discordToken: string;
    maxQueueSize: number;
    statusTimePeriod: number;
    levenshteinThreshold: number;
    volumeModifier: number;
    embedColour: HexColorString;
    timeoutThresholds: {
        discordLogin: number;
        fetchResults: number;
        generateResource: number;
        connect: number;
        play: number;
        inactivity: number;
        clearQueue: number;
        stopMessageListeners: number;
    };
}

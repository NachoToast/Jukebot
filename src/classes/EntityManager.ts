import { TextBasedChannel, VoiceBasedChannel, channelMention } from 'discord.js';
import { Jukebox } from './Jukebox';

/** Manages Jukebox instances per guild. */
export abstract class EntityManager {
    private static readonly _instances: Map<string, Jukebox> = new Map();

    public static getGuildInstance(guildId: string): Jukebox | undefined {
        return EntityManager._instances.get(guildId);
    }

    public static makeGuildInstance(textChannel: TextBasedChannel, voiceChannel: VoiceBasedChannel): Jukebox {
        if (!voiceChannel.joinable) {
            throw new Error(`Cannot join ${channelMention(voiceChannel.id)}`);
        }

        const instance = new Jukebox(textChannel, voiceChannel, (guildId) => this.handleInstanceDestroy(guildId));
        EntityManager._instances.set(voiceChannel.guild.id, instance);
        return instance;
    }

    public static getOrMakeGuildInstance(textChannel: TextBasedChannel, voiceChannel: VoiceBasedChannel): Jukebox {
        return (
            EntityManager.getGuildInstance(voiceChannel.guild.id) ??
            EntityManager.makeGuildInstance(textChannel, voiceChannel)
        );
    }

    private static handleInstanceDestroy(guildId: string): void {
        EntityManager._instances.delete(guildId);
    }
}
